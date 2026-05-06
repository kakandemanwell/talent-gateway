import { Navigate } from "react-router-dom";
import { jobListings } from "@/data/mock";

// Default pipeline view picks the first job.
export default function PipelineIndex() {
  return <Navigate to={`/app/org/pipeline/${jobListings[0].id}`} replace />;
}
