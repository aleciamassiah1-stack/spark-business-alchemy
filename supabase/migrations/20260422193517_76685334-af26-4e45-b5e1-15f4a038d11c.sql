DROP POLICY IF EXISTS "Property images are publicly readable" ON storage.objects;

CREATE POLICY "Users list own property images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'property-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);