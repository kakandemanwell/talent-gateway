import { supabase, FILES_BUCKET } from "@/lib/supabase";

/* ------------------------------------------------------------------ */
/*  Types matching the form state in Index.tsx                        */
/* ------------------------------------------------------------------ */

export interface ExperiencePayload {
  position: string;
  description: string;
  employer: string;
  startDate: string;
  endDate: string;
  years: string;
}

export interface EducationPayload {
  qualification: string;
  level: string;
  field: string;
  institution: string;
  yearCompleted: string;
  accolade: File | null;
}

export interface ApplicationPayload {
  fullName: string;
  email: string;
  phone: string;
  summary: string;
  cv: File;
  experience: ExperiencePayload[];
  education: EducationPayload[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/**
 * Upload a file to the Supabase storage bucket.
 * Returns the stored file path (relative to the bucket root).
 */
async function uploadFile(
  bucketPath: string,
  file: File
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(FILES_BUCKET)
    .upload(bucketPath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    throw new Error(`File upload failed (${bucketPath}): ${error.message}`);
  }

  return data.path;
}

/* ------------------------------------------------------------------ */
/*  Main submission function                                          */
/* ------------------------------------------------------------------ */

/**
 * Submit a complete job application to Supabase.
 *
 * Flow:
 * 1. Insert the application row and get its ID.
 * 2. Upload the CV to the storage bucket.
 * 3. Upload any education accolade files to the storage bucket.
 * 4. Insert experience rows linked to the application.
 * 5. Insert education rows linked to the application.
 * 6. Update the application row with the CV file path.
 */
export async function submitApplication(
  payload: ApplicationPayload
): Promise<{ applicationId: string }> {
  /* ---- 1. Insert application ------------------------------------ */
  const { data: appData, error: appError } = await supabase
    .from("applications")
    .insert({
      full_name: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      summary: payload.summary,
      status: "new",
    })
    .select("id")
    .single();

  if (appError || !appData) {
    throw new Error(
      `Failed to create application: ${appError?.message ?? "Unknown error"}`
    );
  }

  const applicationId: string = appData.id;

  try {
    /* ---- 2. Upload CV ------------------------------------------- */
    const cvExt = payload.cv.name.split(".").pop() ?? "pdf";
    const cvPath = `${applicationId}/cv/${Date.now()}.${cvExt}`;
    const storedCvPath = await uploadFile(cvPath, payload.cv);

    // Update the application row with the CV path
    const { error: cvUpdateError } = await supabase
      .from("applications")
      .update({ cv_file_path: storedCvPath })
      .eq("id", applicationId);

    if (cvUpdateError) {
      throw new Error(
        `Failed to link CV to application: ${cvUpdateError.message}`
      );
    }

    /* ---- 3. Insert experience rows ------------------------------ */
    if (payload.experience.length > 0) {
      const experienceRows = payload.experience.map((exp) => ({
        application_id: applicationId,
        position: exp.position,
        description: exp.description,
        employer: exp.employer,
        start_date: exp.startDate,
        end_date: exp.endDate,
        years: exp.years ? parseFloat(exp.years) : null,
      }));

      const { error: expError } = await supabase
        .from("experience")
        .insert(experienceRows);

      if (expError) {
        throw new Error(
          `Failed to save experience records: ${expError.message}`
        );
      }
    }

    /* ---- 4. Insert education rows + upload accolades ------------ */
    if (payload.education.length > 0) {
      const educationRows = await Promise.all(
        payload.education.map(async (edu) => {
          let accoladeFilePath: string | null = null;

          if (edu.accolade) {
            const accoladeExt =
              edu.accolade.name.split(".").pop() ?? "pdf";
            const accoladePath = `${applicationId}/accolades/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${accoladeExt}`;
            accoladeFilePath = await uploadFile(accoladePath, edu.accolade);
          }

          return {
            application_id: applicationId,
            qualification: edu.qualification,
            level: edu.level,
            field_of_study: edu.field,
            institution: edu.institution,
            year_completed: edu.yearCompleted
              ? parseInt(edu.yearCompleted, 10)
              : null,
            accolade_file_path: accoladeFilePath,
          };
        })
      );

      const { error: eduError } = await supabase
        .from("education")
        .insert(educationRows);

      if (eduError) {
        throw new Error(
          `Failed to save education records: ${eduError.message}`
        );
      }
    }

    return { applicationId };
  } catch (err) {
    // If anything fails after the application row was created,
    // mark it as failed so it can be cleaned up later.
    await supabase
      .from("applications")
      .update({ status: "submission_failed" })
      .eq("id", applicationId);

    throw err;
  }
}
