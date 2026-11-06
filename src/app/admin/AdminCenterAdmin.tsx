"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Inbox,
  HeartHandshake,
  Calendar,
  BookOpen,
  Sparkles,
  UserCheck,
  ShieldCheck,
  Trash2,
  Clock,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertCircle,
  Users,
  Server,
  Database,
  ChevronRight,
  Layers,
  Activity,
} from "lucide-react";
import { type SiteData } from "@/lib/data";
import {
  getSubmissions,
  loadSubmissions,
  type SubmissionItem,
} from "@/lib/backend";
import {
  type AdminUser,
  getRoleById,
  getStoredAdminUsers,
  getStoredRoles,
} from "@/lib/permissions";
import { getTrashItems } from "@/lib/recycleBin";
import { CAMPAIGNS, type Campaign } from "../constants/campaigns";
import { categoryOf } from "./SubmissionsAdmin";

interface AdminCenterAdminProps {
  siteData: SiteData;
  onSelectSection: (sectionId: string) => void;
  currentAdminUser: AdminUser;
  onObserveSite: () => void;
}

export function AdminCenterAdmin({
  siteData,
  onSelectSection,
  currentAdminUser,
  onObserveSite,
}: AdminCenterAdminProps) {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>(() => getSubmissions());
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>(CAMPAIGNS);
  const [trashCount, setTrashCount] = useState<number>(() => getTrashItems().length);

  const role = getRoleById(currentAdminUser?.roleId);

  // Sync latest submissions and campaigns continuously in background
  const refreshData = useCallback(async (silent = true) => {
    if (!silent) setLoading(true);
    try {
      const items = await loadSubmissions();
      setSubmissions(items);
      setTrashCount(getTrashItems().length);

      const res = await fetch("/api/campaigns");
      if (res.ok) {
        const campData = await res.json();
        if (Array.isArray(campData) && campData.length > 0) {
          setCampaigns(campData);
        }
      }
    } catch (err) {
      console.warn("Failed to refresh admin center data:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData(false);

    // Continuous 15-second background polling
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        refreshData(true);
      }
    }, 15000);

    const handleTrashSync = () => setTrashCount(getTrashItems().length);
    const handleSilentSync = () => refreshData(true);

    let channel: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      channel = new BroadcastChannel("mahila_live_channel");
      channel.onmessage = () => handleSilentSync();
    }

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        refreshData(true);
      }
    };

    window.addEventListener("mahila_trash_changed", handleTrashSync);
    window.addEventListener("mahila_submissions_changed", handleSilentSync);
    window.addEventListener("focus", handleVisibilityChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      if (channel) channel.close();
      window.removeEventListener("mahila_trash_changed", handleTrashSync);
      window.removeEventListener("mahila_submissions_changed", handleSilentSync);
      window.removeEventListener("focus", handleVisibilityChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshData]);

  // Compute key submission metrics
  const submissionMetrics = useMemo(() => {
    const total = submissions.length;
    let pending = 0;
    let volunteers = 0;
    let vendors = 0;
    let reservations = 0;
    let contact = 0;
    let donationsCount = 0;
    let totalDonationAmount = 0;

    submissions.forEach((item) => {
      const cat = categoryOf(item);
      const isPending = !item.status || item.status.toLowerCase() === "pending" || item.status.toLowerCase() === "new";
      if (isPending) pending++;

      if (cat === "volunteer" || cat === "perm_volunteer_request") volunteers++;
      else if (cat === "vendor") vendors++;
      else if (cat === "reservation") reservations++;
      else if (cat === "contact") contact++;
      else if (cat === "donation") {
        donationsCount++;
        const amt = Number(item.data?.amount) || 0;
        totalDonationAmount += amt;
      }
    });

    return {
      total,
      pending,
      volunteers,
      vendors,
      reservations,
      contact,
      donationsCount,
      totalDonationAmount,
    };
  }, [submissions]);

  // Compute events metrics
  const eventMetrics = useMemo(() => {
    const events = siteData.events || [];
    const totalEvents = events.length;
    let totalBooked = 0;
    let totalCapacity = 0;

    events.forEach((ev) => {
      totalBooked += Number(ev.bookedSeats || 0);
      totalCapacity += Number(ev.totalSeats || 0);
    });

    return { totalEvents, totalBooked, totalCapacity };
  }, [siteData.events]);

  // Compute stories metrics
  const contentMetrics = useMemo(() => {
    const posts = siteData.blogPosts || [];
    const communityStories = posts.filter((p) => p.section === "story").length;
    const impactStories = posts.filter((p) => p.section === "impact").length;
    const eventBlogs = posts.filter((p) => p.section === "event").length;
    const councilors = (siteData.councilors || []).length;
    const categories = (siteData.categories || []).length;

    return {
      totalPosts: posts.length,
      communityStories,
      impactStories,
      eventBlogs,
      councilors,
      categories,
    };
  }, [siteData]);

  // Admin users & roles count
  const userMetrics = useMemo(() => {
    const users = getStoredAdminUsers();
    const roles = getStoredRoles();
    return {
      totalUsers: users.length,
      activeUsers: users.filter((u) => u.status === "Active").length,
      totalRoles: roles.length,
    };
  }, []);

  // Latest 6 submissions
  const recentSubmissions = useMemo(() => {
    return [...submissions]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 6);
  }, [submissions]);

  // Upcoming events
  const upcomingEvents = useMemo(() => {
    return [...(siteData.events || [])]
      .filter((ev) => ev.published !== false)
      .slice(0, 4);
  }, [siteData.events]);


  const greetingTime = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8 font-['Inter',sans-serif] pb-12">
      {/* ── HEADER BANNER ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#a65a4a] via-[#8b263e] to-[#732034] rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-[#f4efe7] shadow-lg border border-white/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white text-[11px] font-semibold tracking-wide uppercase backdrop-blur-xs">
              <Activity className="w-3.5 h-3.5 text-amber-300" />
              <span>Admin Operations Center</span>
            </div>
            <h1
              className="font-['Fraunces',serif] text-[26px] sm:text-[32px] md:text-[36px] font-bold leading-tight"
              style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
            >
              {greetingTime}, {currentAdminUser?.name || "Administrator"}!
            </h1>
            <p className="text-white/80 text-[13px] sm:text-[14px] max-w-2xl leading-relaxed">
              Welcome to the centralized management hub. Track community submissions, oversee donation campaigns,
              publish grassroots impact stories, and manage organizational permissions from one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => refreshData(false)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-[#f4efe7] text-[13px] font-medium transition-all cursor-pointer backdrop-blur-xs disabled:opacity-50"
              title="Refresh dashboard metrics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>

            <button
              onClick={onObserveSite}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#8b263e] hover:bg-[#f4efe7] text-[13px] font-bold transition-all shadow-md cursor-pointer"
              title="Observe live website as visitors see it"
            >
              <Eye className="w-4 h-4 text-[#8b263e]" />
              <span>Observe Live Site</span>
            </button>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="absolute right-1/3 -top-12 w-48 h-48 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />
      </div>

      {/* ── PRIMARY KPI CARDS ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Submissions Card */}
        <div
          onClick={() => onSelectSection("submissions")}
          className="group bg-white rounded-2xl p-5 border border-[#a65a4a]/15 shadow-xs hover:shadow-md hover:border-[#a65a4a]/30 transition-all cursor-pointer relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
              <Inbox className="w-5 h-5" />
            </div>
            {submissionMetrics.pending > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                <Clock className="w-3 h-3" />
                {submissionMetrics.pending} Pending
              </span>
            )}
          </div>
          <div className="text-[28px] font-bold text-[#1e1e1e] font-['Fraunces',serif]">
            {submissionMetrics.total}
          </div>
          <div className="text-[13px] font-semibold text-[#1e1e1e]/70">Form Submissions</div>
          <div className="mt-2 text-[11px] text-[#1e1e1e]/50 flex items-center justify-between border-t border-gray-100 pt-2">
            <span>
              {submissionMetrics.volunteers} Volunteers • {submissionMetrics.reservations} Seats
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-[#a65a4a] group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Donations Card */}
        <div
          onClick={() => onSelectSection("donations")}
          className="group bg-white rounded-2xl p-5 border border-[#a65a4a]/15 shadow-xs hover:shadow-md hover:border-[#a65a4a]/30 transition-all cursor-pointer relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              <TrendingUp className="w-3 h-3" />
              {campaigns.length} Campaigns
            </span>
          </div>
          <div className="text-[28px] font-bold text-[#1e1e1e] font-['Fraunces',serif]">
            ₹{submissionMetrics.totalDonationAmount.toLocaleString("en-IN")}
          </div>
          <div className="text-[13px] font-semibold text-[#1e1e1e]/70">Donations &amp; Giving</div>
          <div className="mt-2 text-[11px] text-[#1e1e1e]/50 flex items-center justify-between border-t border-gray-100 pt-2">
            <span>{submissionMetrics.donationsCount} Direct Donor Gifts</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#a65a4a] group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Events Card */}
        <div
          onClick={() => onSelectSection("events")}
          className="group bg-white rounded-2xl p-5 border border-[#a65a4a]/15 shadow-xs hover:shadow-md hover:border-[#a65a4a]/30 transition-all cursor-pointer relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-700 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              {eventMetrics.totalBooked} Attendees
            </span>
          </div>
          <div className="text-[28px] font-bold text-[#1e1e1e] font-['Fraunces',serif]">
            {eventMetrics.totalEvents}
          </div>
          <div className="text-[13px] font-semibold text-[#1e1e1e]/70">Upcoming Events</div>
          <div className="mt-2 text-[11px] text-[#1e1e1e]/50 flex items-center justify-between border-t border-gray-100 pt-2">
            <span>Capacity: {eventMetrics.totalCapacity} total seats</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#a65a4a] group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Stories & Impact Card */}
        <div
          onClick={() => onSelectSection("stories")}
          className="group bg-white rounded-2xl p-5 border border-[#a65a4a]/15 shadow-xs hover:shadow-md hover:border-[#a65a4a]/30 transition-all cursor-pointer relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-700 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
              <Sparkles className="w-3 h-3" />
              {contentMetrics.categories} Categories
            </span>
          </div>
          <div className="text-[28px] font-bold text-[#1e1e1e] font-['Fraunces',serif]">
            {contentMetrics.totalPosts}
          </div>
          <div className="text-[13px] font-semibold text-[#1e1e1e]/70">Published Stories &amp; Articles</div>
          <div className="mt-2 text-[11px] text-[#1e1e1e]/50 flex items-center justify-between border-t border-gray-100 pt-2">
            <span>
              {contentMetrics.communityStories} Stories • {contentMetrics.impactStories} Impacts
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-[#a65a4a] group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* ── QUICK ACTION LAUNCHPAD ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#a65a4a]/15 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#a65a4a]" />
            <h2 className="font-['Fraunces',serif] text-[18px] font-bold text-[#1e1e1e]">
              Quick Management Shortcuts
            </h2>
          </div>
          <span className="text-[12px] text-[#1e1e1e]/50">Jump straight into action</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <button
            onClick={() => onSelectSection("submissions")}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-gray-100 hover:border-[#a65a4a]/40 bg-gray-50/50 hover:bg-[#a65a4a]/5 transition-all text-center group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Inbox className="w-4 h-4" />
            </div>
            <span className="text-[12px] font-semibold text-[#1e1e1e] line-clamp-1">Submissions</span>
            <span className="text-[10px] text-[#1e1e1e]/50 mt-0.5">Review items</span>
          </button>

          <button
            onClick={() => onSelectSection("donations")}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-gray-100 hover:border-[#a65a4a]/40 bg-gray-50/50 hover:bg-[#a65a4a]/5 transition-all text-center group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <span className="text-[12px] font-semibold text-[#1e1e1e] line-clamp-1">Donations</span>
            <span className="text-[10px] text-[#1e1e1e]/50 mt-0.5">Track gifts</span>
          </button>

          <button
            onClick={() => onSelectSection("events")}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-gray-100 hover:border-[#a65a4a]/40 bg-gray-50/50 hover:bg-[#a65a4a]/5 transition-all text-center group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-[12px] font-semibold text-[#1e1e1e] line-clamp-1">Events</span>
            <span className="text-[10px] text-[#1e1e1e]/50 mt-0.5">Schedule</span>
          </button>

          <button
            onClick={() => onSelectSection("stories")}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-gray-100 hover:border-[#a65a4a]/40 bg-gray-50/50 hover:bg-[#a65a4a]/5 transition-all text-center group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-[12px] font-semibold text-[#1e1e1e] line-clamp-1">Stories</span>
            <span className="text-[10px] text-[#1e1e1e]/50 mt-0.5">Publish</span>
          </button>

          <button
            onClick={() => onSelectSection("councilors")}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-gray-100 hover:border-[#a65a4a]/40 bg-gray-50/50 hover:bg-[#a65a4a]/5 transition-all text-center group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <UserCheck className="w-4 h-4" />
            </div>
            <span className="text-[12px] font-semibold text-[#1e1e1e] line-clamp-1">Councilors</span>
            <span className="text-[10px] text-[#1e1e1e]/50 mt-0.5">Advocates</span>
          </button>

          <button
            onClick={() => onSelectSection("roles")}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-gray-100 hover:border-[#a65a4a]/40 bg-gray-50/50 hover:bg-[#a65a4a]/5 transition-all text-center group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-[12px] font-semibold text-[#1e1e1e] line-clamp-1">Roles &amp; Users</span>
            <span className="text-[10px] text-[#1e1e1e]/50 mt-0.5">{userMetrics.totalUsers} accounts</span>
          </button>

          <button
            onClick={() => onSelectSection("trash")}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-gray-100 hover:border-[#a65a4a]/40 bg-gray-50/50 hover:bg-[#a65a4a]/5 transition-all text-center group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-gray-500/10 text-gray-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform relative">
              <Trash2 className="w-4 h-4" />
              {trashCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </div>
            <span className="text-[12px] font-semibold text-[#1e1e1e] line-clamp-1">Recycle Bin</span>
            <span className="text-[10px] text-[#1e1e1e]/50 mt-0.5">{trashCount} items</span>
          </button>
        </div>
      </div>

      {/* ── TWO-COLUMN DETAILED OVERVIEW ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Submissions (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-[#a65a4a]/15 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Inbox className="w-5 h-5 text-[#a65a4a]" />
                <h3 className="font-['Fraunces',serif] text-[18px] font-bold text-[#1e1e1e]">
                  Recent Submissions &amp; Registrations
                </h3>
              </div>
              <button
                onClick={() => onSelectSection("submissions")}
                className="text-[12px] font-semibold text-[#a65a4a] hover:text-[#993925] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>View all ({submissionMetrics.total})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentSubmissions.length === 0 ? (
              <div className="text-center py-10 text-[#1e1e1e]/40 text-[13px]">
                No form submissions recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentSubmissions.map((item) => {
                  const cat = categoryOf(item);
                  const isPending =
                    !item.status || item.status.toLowerCase() === "pending" || item.status.toLowerCase() === "new";
                  const displayName = item.data?.name || item.data?.full_name || "Anonymous";
                  const displayContact = item.data?.email || item.data?.phone || "No contact info";
                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectSection("submissions")}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-gray-50/80 px-2 rounded-xl transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#a65a4a]/10 text-[#a65a4a] font-bold text-[13px] flex items-center justify-center shrink-0">
                          {(displayName || "U")[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-[#1e1e1e] text-[13px] truncate">
                              {displayName}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-gray-100 text-gray-700">
                              {cat}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#1e1e1e]/50 truncate">
                            {displayContact}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${isPending
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                            }`}
                        >
                          {item.status || "Pending"}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-[#1e1e1e]/60">
            <span>Real-time PostgreSQL synced</span>
            <button
              onClick={() => onSelectSection("submissions")}
              className="text-[#a65a4a] font-semibold hover:underline cursor-pointer"
            >
              Manage applications →
            </button>
          </div>
        </div>

        {/* Right Column: Upcoming Events & Platform Status */}
        <div className="space-y-6">
          {/* Upcoming Events Box */}
          <div className="bg-white rounded-2xl p-5 border border-[#a65a4a]/15 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="font-['Fraunces',serif] text-[17px] font-bold text-[#1e1e1e]">
                  Active Event Dates
                </h3>
              </div>
              <button
                onClick={() => onSelectSection("events")}
                className="text-[12px] font-semibold text-[#a65a4a] hover:text-[#993925] cursor-pointer"
              >
                All Events
              </button>
            </div>

            {upcomingEvents.length === 0 ? (
              <p className="text-[13px] text-[#1e1e1e]/40 py-4 text-center">No upcoming events listed.</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((ev) => {
                  const percent = ev.totalSeats
                    ? Math.min(100, Math.round(((ev.bookedSeats || 0) / ev.totalSeats) * 100))
                    : 0;
                  return (
                    <div
                      key={ev.id}
                      onClick={() => onSelectSection("events")}
                      className="p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/20 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-[11px] text-[#1e1e1e]/50 mb-1">
                        <span className="font-bold text-[#a65a4a]">{ev.eventDate || "Date TBA"}</span>
                        <span>{ev.bookedSeats || 0} / {ev.totalSeats || "—"} seats</span>
                      </div>
                      <h4 className="text-[13px] font-semibold text-[#1e1e1e] line-clamp-1">{ev.title}</h4>
                      {ev.totalSeats ? (
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-2">
                          <div
                            className="bg-[#a65a4a] h-full rounded-full transition-all"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* System & Session Health Box */}
          <div className="bg-white rounded-2xl p-5 border border-[#a65a4a]/15 shadow-xs">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
              <Server className="w-4 h-4 text-emerald-600" />
              <h3 className="font-['Fraunces',serif] text-[16px] font-bold text-[#1e1e1e]">
                Platform Status
              </h3>
            </div>

            <div className="space-y-2.5 text-[12px]">
              <div className="flex items-center justify-between">
                <span className="text-[#1e1e1e]/60 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-600" /> Database (PostgreSQL)
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </span>
              </div>


              <div className="flex items-center justify-between">
                <span className="text-[#1e1e1e]/60 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Current Session
                </span>
                <span className="font-semibold text-[#1e1e1e]">
                  {role?.name || "Admin"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#1e1e1e]/60 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" /> User Accounts
                </span>
                <span className="font-semibold text-[#1e1e1e]">
                  {userMetrics.activeUsers} Active
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#1e1e1e]/60 flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5 text-gray-500" /> Recycle Bin
                </span>
                <span className="font-semibold text-[#1e1e1e]">
                  {trashCount} items
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
