
-- Trigger to update artisan job counts when job status changes
CREATE TRIGGER trg_update_artisan_job_counts
  AFTER UPDATE OF status ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_artisan_job_counts();

-- Trigger to update artisan rating average when a review is inserted or updated
CREATE TRIGGER trg_update_artisan_rating
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_artisan_rating();
