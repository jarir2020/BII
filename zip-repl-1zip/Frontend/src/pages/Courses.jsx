import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLang } from "../contexts/LangContext";
import { api, imgUrl } from "../lib/api";
import AdBanner from "../components/AdBanner";
import BottomBanner from "../components/BottomBanner";

export default function Courses() {
  const { t, pick } = useLang();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/courses").then((r) => setCourses(r.data || [])).finally(() => setLoading(false));
  }, []);

  return (
    <div data-testid="courses-page" className="pb-16 sm:pb-24">
      <h1 className="font-heading text-3xl text-[var(--bii-emerald)] mb-1">{t("menuOurCourses")}</h1>
      <p className="text-sm text-[var(--bii-text-soft)] mb-4">{pick("আমাদের সকল ইসলামিক কোর্স", "All our Islamic courses")}</p>
      <AdBanner slot="courses-top" format="responsive" className="mb-4" />

      {loading && <div className="text-center text-[var(--bii-text-soft)] py-8">{t("loading")}</div>}
      {!loading && courses.length === 0 && <div className="text-center text-[var(--bii-text-soft)] py-8">{t("noData")}</div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((c) => (
          <Link key={c.id} to={`/courses/${c.id}`} data-testid={`course-card-${c.id}`} className="bii-card overflow-hidden flex flex-col">
            <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[var(--bii-emerald)] to-teal-700">
              {c.cover_image ? (
                <img
                  src={imgUrl(c.cover_image)}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              ) : (
                /* Islamic pattern placeholder */
                <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10"
                    style={{backgroundImage:"url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"}} />
                  <div className="text-4xl mb-2">📚</div>
                  <div className="text-white/90 text-xs font-semibold text-center px-4 leading-snug line-clamp-2">
                    {pick(c.title_bn, c.title_en)}
                  </div>
                </div>
              )}
              {c.is_free && (
                <div className="absolute top-3 left-3 bg-[var(--bii-gold)] text-[var(--bii-emerald)] text-xs font-bold tracking-wider px-2.5 py-1 rounded-full">
                  {t("free")}
                </div>
              )}
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="font-heading text-lg text-[var(--bii-emerald)] mb-1">{pick(c.title_bn, c.title_en)}</h3>
              <p className="text-sm text-[var(--bii-text-soft)] line-clamp-2 flex-1">{pick(c.description_bn, c.description_en)}</p>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-[var(--bii-text-soft)]">{c.instructor}</div>
                <div className="font-heading text-[var(--bii-emerald)]">
                  {c.is_free ? t("free") : `৳ ${c.price}`}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <BottomBanner slot="courses-bottom" />
    </div>
  );
}
