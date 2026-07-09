-- Create policy for marking messages as read
CREATE POLICY "Users can mark received messages as read" ON public.chat_messages
  FOR UPDATE USING (
    auth.uid() = receiver_id
  ) WITH CHECK (
    auth.uid() = receiver_id
  );
