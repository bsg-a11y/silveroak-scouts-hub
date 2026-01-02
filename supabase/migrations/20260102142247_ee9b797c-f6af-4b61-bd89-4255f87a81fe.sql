-- Allow users to delete their own notifications
CREATE POLICY "Users can delete own notifications" 
ON public.notifications 
FOR DELETE 
USING ((auth.uid() IS NOT NULL) AND (user_id = auth.uid()));