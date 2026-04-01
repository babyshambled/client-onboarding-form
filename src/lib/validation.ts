import { z } from "zod";

const BIGGEST_COST_OPTIONS = [
  "DMs",
  "Sales Calls",
  "Content",
  "Positioning",
  "All of the above",
  "Something else",
] as const;

export const submissionSchema = z
  .object({
    // Contact
    name: z.string().min(1, "Name is required").max(200),
    email: z.string().email("Invalid email address"),

    // Section 1: Business
    business_description: z
      .string()
      .min(1, "Business description is required")
      .max(5000),
    problems_solved: z
      .string()
      .min(1, "Problems solved is required")
      .max(5000),
    current_clients: z
      .string()
      .min(1, "Current clients is required")
      .max(5000),
    ideal_client: z.string().min(1, "Ideal client is required").max(5000),
    pricing_structure: z
      .string()
      .min(1, "Pricing structure is required")
      .max(5000),

    // Section 2: Self-Assessment (1-5 ratings)
    rating_ideal_client_clarity: z.number().int().min(1).max(5),
    rating_articulation: z.number().int().min(1).max(5),
    rating_inbound_leads: z.number().int().min(1).max(5),
    rating_dm_confidence: z.number().int().min(1).max(5),
    rating_dm_to_call: z.number().int().min(1).max(5),
    rating_objection_handling: z.number().int().min(1).max(5),
    rating_close_rate: z.number().int().min(1).max(5),
    rating_content_conversations: z.number().int().min(1).max(5),
    rating_dm_system: z.number().int().min(1).max(5),
    rating_expert_positioning: z.number().int().min(1).max(5),

    // Section 3: Pain Points
    biggest_cost: z.enum(BIGGEST_COST_OPTIONS),
    biggest_cost_other: z.string().max(5000).optional(),
    attempted_fixes: z
      .string()
      .min(1, "Attempted fixes is required")
      .max(5000),

    // Section 4: Prospects
    top_3_client_problems: z
      .string()
      .min(1, "Top 3 client problems is required")
      .max(5000),
    client_false_beliefs: z
      .string()
      .min(1, "Client false beliefs is required")
      .max(5000),

    // Section 5: Goals
    ninety_day_success: z
      .string()
      .min(1, "90-day success is required")
      .max(5000),
    anything_else: z.string().min(1, "Anything else is required").max(5000),
  })
  .refine(
    (data) => {
      if (data.biggest_cost === "Something else") {
        return (
          data.biggest_cost_other !== undefined &&
          data.biggest_cost_other.trim().length > 0
        );
      }
      return true;
    },
    {
      message:
        'Please specify what the biggest cost is when selecting "Something else"',
      path: ["biggest_cost_other"],
    }
  );

export type SubmissionFormData = z.infer<typeof submissionSchema>;
