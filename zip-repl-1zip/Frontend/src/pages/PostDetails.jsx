import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useLang } from "../contexts/LangContext";
import { api, imgUrl } from "../lib/api";
import AdBanner from "../components/AdBanner";
import BottomBanner from "../components/BottomBanner";

export default function PostDetails() {
  const { id } = useParams();
  const { t, pick } = useLang();
  const [post, setPost] = useState(null);
  const [course, setCourse] = useState(null);

  useEffect(() => {
    api.get(`/posts/${id}`).then(async (r) => {
      setPost(r.data);
      if (r.data.course_id) {
        try { const c = await api.get(`/courses/${r.data.course_id}`); setCourse(c.data); } catch { /* ignore */ }
      }
    });
  }, [id]);

  if (!post) return <div className="text-center py-8 text-[var(--bii-text-soft)]">{t("loading")}</div>;

  return (
    <div className="max-w-3xl mx-auto pb-16 sm:pb-24" data-testid="post-details-page">
      <div className="bii-card overflow-hidden">
        {post.cover_image && <div className="aspect-[21/9] overflow-hidden"><img src={imgUrl(post.cover_image)} alt="" className="w-full h-full object-cover" /></div>}
        <div className="p-6">
          <h1 className="font-heading text-2xl sm:text-3xl text-[var(--bii-emerald)]">{pick(post.title_bn, post.title_en)}</h1>
          <div className="gold-divider my-4" />
          <p className="text-[var(--bii-text-soft)] leading-relaxed whitespace-pre-line">{pick(post.body_bn, post.body_en)}</p>
          <BottomBanner slot="post-bottom" />
          {course && (
            <div className="mt-6 bg-[var(--bii-cream)] p-4 rounded-xl flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-widest text-[var(--bii-text-soft)]">{t("course")}</div>
                <div className="font-heading text-lg">{pick(course.title_bn, course.title_en)}</div>
                <div className="font-heading text-[var(--bii-emerald)]">{course.is_free ? t("free") : `৳ ${course.price}`}</div>
              </div>
              <Link to={`/courses/${course.id}`} data-testid="post-cta-link" className="bii-btn-primary">
                {post.cta_label_bn || t("viewDetails")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
