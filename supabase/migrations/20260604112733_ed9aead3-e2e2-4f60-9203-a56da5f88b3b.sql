
-- PROFILES
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- PHOTOS
CREATE TABLE public.photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  taken_at TIMESTAMPTZ,
  location_source TEXT NOT NULL DEFAULT 'manual' CHECK (location_source IN ('exif','manual','none')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photos TO authenticated;
GRANT ALL ON public.photos TO service_role;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photos are viewable by authenticated users"
  ON public.photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own photos"
  ON public.photos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own photos"
  ON public.photos FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own photos"
  ON public.photos FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX photos_user_id_idx ON public.photos(user_id);
CREATE INDEX photos_coords_idx ON public.photos(latitude, longitude);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_photos_updated_at BEFORE UPDATE ON public.photos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STORAGE POLICIES on photos bucket
CREATE POLICY "Photo files viewable by authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'photos');
CREATE POLICY "Users upload to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);
