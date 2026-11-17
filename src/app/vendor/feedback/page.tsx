"use client";
import { useEffect, useState } from "react";
import { api, dateTime } from "@/lib/client";
import { Empty } from "@/components/ui";

type Analytics = { canteen_id: number; canteen_name: string; averageRating: number; feedbackCount: number };
type Comment = { student_id: number; canteen_id: number; rating: number; comment: string | null; timestamp: string };

export default function VendorFeedbackPage() {
  const [analytics, setAnalytics] = useState<Analytics[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ analytics: Analytics[]; comments: Comment[] }>("/api/vendor/feedback")
      .then((d) => { setAnalytics(d.analytics); setComments(d.comments); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-forest-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-forest-900">Feedback analytics</h1>
        <p className="text-forest-600">Computed with a MongoDB aggregation pipeline over the feedback collection.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {analytics.length === 0 ? (
          <Empty>No feedback yet.</Empty>
        ) : analytics.map((a) => (
          <div key={a.canteen_id} className="card p-5">
            <p className="font-semibold text-forest-900">{a.canteen_name}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-forest-900">{a.averageRating?.toFixed(2)}</span>
              <span className="text-xl text-amber-500">★</span>
            </div>
            <p className="mt-1 text-sm text-forest-500">{a.feedbackCount} rating(s)</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-forest-900">Recent comments</h2>
        {comments.length === 0 ? (
          <Empty>No comments yet.</Empty>
        ) : (
          <div className="space-y-2">
            {comments.map((c, i) => (
              <div key={i} className="card flex items-start justify-between gap-4 p-4">
                <div>
                  <p className="text-amber-500">{"★".repeat(c.rating)}<span className="text-forest-200">{"★".repeat(5 - c.rating)}</span></p>
                  {c.comment && <p className="mt-1 text-sm text-forest-700">{c.comment}</p>}
                </div>
                <span className="whitespace-nowrap text-xs text-forest-400">{dateTime(c.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
