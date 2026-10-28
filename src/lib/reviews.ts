import { z } from "zod";
export const reviewInput = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(300),
});
const summary = z.object({
  producer_id: z.string().uuid(),
  average: z.coerce.number().min(1).max(5),
  total: z.coerce.number().int().positive(),
});
const comment = z.object({
  id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(300),
  created_at: z.string(),
});
export type ReviewSummary = z.infer<typeof summary>;
export type ReviewComment = z.infer<typeof comment>;
export async function reviewSummaries(ids: string[]) {
  if (!ids.length) return [];
  const { cloudClient } = await import("./cloud-client");
  const rows: ReviewSummary[] = [];
  const unique = [...new Set(ids)].map((id) => z.string().uuid().parse(id));
  for (let i = 0; i < unique.length; i += 200) {
    const r = await cloudClient().rpc("uzta_review_summaries", {
      p_ids: unique.slice(i, i + 200),
    });
    if (r.error) throw Error("reviews");
    rows.push(...z.array(summary).parse(r.data));
  }
  return rows;
}
export async function reviewComments(id: string) {
  const { cloudClient } = await import("./cloud-client");
  const r = await cloudClient().rpc("uzta_review_comments", {
    p_producer: z.string().uuid().parse(id),
  });
  if (r.error) throw Error("reviews");
  return z.array(comment).parse(r.data);
}
export async function ownReview(order: string, user: string) {
  const { cloudClient } = await import("./cloud-client");
  const r = await cloudClient()
    .from("uzta_reviews")
    .select("rating,comment")
    .eq("order_id", z.string().uuid().parse(order))
    .eq("buyer_id", z.string().uuid().parse(user))
    .maybeSingle();
  if (r.error) throw Error("reviews");
  return r.data === null ? null : reviewInput.parse(r.data);
}
export async function submitReview(
  order: string,
  rating: number,
  comment: string,
) {
  const input = reviewInput.parse({ rating, comment });
  const { cloudClient } = await import("./cloud-client");
  const r = await cloudClient().rpc("uzta_submit_review", {
    p_order: z.string().uuid().parse(order),
    p_rating: input.rating,
    p_comment: input.comment,
  });
  if (r.error) throw Error("reviews");
}
