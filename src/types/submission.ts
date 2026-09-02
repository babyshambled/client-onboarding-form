export interface Submission {
  id: string;
  created_at: string;

  // Contact
  name: string;
  email: string;

  // Section 1: Business
  business_description: string;
  problems_solved: string;
  current_clients: string;
  ideal_client: string;
  pricing_structure: string;

  // Section 2: Self-Assessment (1-5 ratings)
  rating_ideal_client_clarity: number;
  rating_articulation: number;
  rating_inbound_leads: number;
  rating_dm_confidence: number;
  rating_dm_to_call: number;
  rating_objection_handling: number;
  rating_close_rate: number;
  rating_content_conversations: number;
  rating_dm_system: number;
  rating_expert_positioning: number;

  // Section 3: Pain Points
  biggest_cost: string;
  biggest_cost_other?: string;
  attempted_fixes: string;

  // Section 4: Prospects
  top_3_client_problems: string;
  client_false_beliefs: string;

  // Section 5: Goals
  ninety_day_success: string;
  anything_else: string;

  // Scoping + handover (all optional)
  their_word?: string;
  can_name_clients?: string;
  rough_client_count?: string;
  pre_conversation_ask?: string;
  handover_asset?: string;

  // Fields the user explicitly marked "I've shared everything I can"
  acknowledged_short_answers?: string[];
}

export type SubmissionInput = Omit<Submission, "id" | "created_at">;
