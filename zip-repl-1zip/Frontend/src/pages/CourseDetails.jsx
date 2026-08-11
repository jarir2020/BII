import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { CheckCircle, GraduationCap, Clock, User } from "@phosphor-icons/react";
import { useLang } from "../contexts/LangContext";
import { useAuth } from "../contexts/AuthContext";
import { api, imgUrl } from "../lib/api";
import AdBanner from "../components/AdBanner";
import BottomBanner from "../components/BottomBanner";

export default function CourseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, pick } = useLang();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [enrolled, setEnrolled] = useState(false);

  useEffect(() => {
    api.get(`/courses/${id}`).then((r) => setCourse(r.data));
    if (user) {
      api.get("/my-courses").then((r) => {
        const data = Array.isArray(r.data) ? r.data : [];
        setEnrolled(data.some((c) => c.id === id));
      });
    }
  }, [id, user]);

  if (!course) return <div className="text-center py-10 text-[var(--bii-text-soft)]">{t("loading")}</div>;

  const handleEnroll = async () => {
    if (!user) { navigate("/login"); return; }
    if (course.is_free) {
      await api.post(`/courses/${id}/enroll`);
      navigate(`/payment/success?course=${id}`);
    } else {
      navigate(`/payment?course=${id}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-16 sm:pb-24" data-testid="course-details-page">
      <div className="bii-card overflow-hidden">
        {course.cover_image && (
          <div className="aspect-[21/9] overflow-hidden">
            <img src={imgUrl(course.cover_image)} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div className="flex-1">
              <h1 className="font-heading text-2xl sm:text-3xl text-[var(--bii-emerald)]">{pick(course.title_bn, course.title_en)}</h1>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-[var(--bii-text-soft)]">
                {course.instructor && <span className="flex items-center gap-1"><User size={16} /> {course.instructor}</span>}
                {course.duration && <span className="flex items-center gap-1"><Clock size={16} /> {course.duration}</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="font-heading text-3xl text-[var(--bii-emerald)]">
                {course.is_free ? t("free") : `৳ ${course.price}`}
              </div>
            </div>
          </div>
          <div className="gold-divider my-4" />
          <h2 className="font-heading text-lg mb-2">{t("description")}</h2>
          <p className="text-[var(--bii-text-soft)] leading-relaxed whitespace-pre-line">{pick(course.description_bn, course.description_en)}</p>
          <BottomBanner slot="course-details-bottom" />
          <div className="mt-6">
            {enrolled ? (
              <div className="flex items-center gap-2 text-green-700 font-medium">
                <CheckCircle size={22} weight="fill" /> {t("enrolled")}
              </div>
            ) : (
              <button data-testid="enroll-btn" onClick={handleEnroll} className="bii-btn-primary w-full sm:w-auto">
                <GraduationCap size={20} weight="duotone" className="inline mr-2" />
                {course.is_free ? t("enroll") : t("proceedPayment")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
