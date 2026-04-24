-- Add missing UPDATE policy on wealth-documents so users can replace their own files
CREATE POLICY "Users update own wealth docs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'wealth-documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'wealth-documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);