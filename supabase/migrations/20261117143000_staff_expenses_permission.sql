-- Stage 103C: expense records are accessible only to active staff
-- explicitly granted the expenses permission (or the primary owner).

DROP POLICY IF EXISTS "Admin can manage expenses" ON public.expenses;
CREATE POLICY "Staff with expenses permission can manage expenses"
  ON public.expenses
  FOR ALL
  TO authenticated
  USING (public.has_staff_permission('expenses'))
  WITH CHECK (public.has_staff_permission('expenses'));
