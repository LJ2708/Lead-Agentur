"use client"

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react"
import type { RepPerformance } from "@/lib/performance/scoring"

interface LeaderboardProps {
  maxRows?: number
  compact?: boolean
}

type Period = "today" | "week" | "month"

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
  if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />
  return (
    <span className="flex h-5 w-5 items-center justify-center text-sm font-semibold text-muted-foreground">
      {rank}
    </span>
  )
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score > 70
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : score >= 40
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-red-50 text-red-700 border-red-200"

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-sm font-bold", color)}>
      {score}
    </span>
  )
}

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-emerald-500" />
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-500" />
  return <Minus className="h-4 w-4 text-muted-foreground" />
}

export function Leaderboard({ maxRows, compact = false }: LeaderboardProps) {
  const [period, setPeriod] = useState<Period>("week")
  const [data, setData] = useState<RepPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const fetchCurrentUser = useCallback(async () => {
    const supabase = createClient()
    const { data: userData } = await supabase.auth.getUser()
    if (userData?.user) {
      const { data: berater } = await supabase
        .from("berater")
        .select("id")
        .eq("profile_id", userData.user.id)
        .single()
      if (berater) setCurrentUserId(berater.id)
    }
  }, [])

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/performance/leaderboard?period=${period}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch {
      // Silently handle error
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchCurrentUser()
  }, [fetchCurrentUser])

  useEffect(() => {
    setLoading(true)
    fetchLeaderboard()
    const interval = setInterval(fetchLeaderboard, 60_000)
    return () => clearInterval(interval)
  }, [fetchLeaderboard])

  const displayData = maxRows ? data.slice(0, maxRows) : data

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Rangliste
          </CardTitle>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList className="h-8">
              <TabsTrigger value="today" className="text-xs px-2.5">
                Heute
              </TabsTrigger>
              <TabsTrigger value="week" className="text-xs px-2.5">
                Woche
              </TabsTrigger>
              <TabsTrigger value="month" className="text-xs px-2.5">
                Monat
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {loading && data.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-blue-500" />
          </div>
        ) : displayData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Keine Daten f&uuml;r diesen Zeitraum
          </p>
        ) : (
          <>
            {/* Podium for top 3 (only in full mode) */}
            {!compact && displayData.length >= 3 && (
              <div className="mb-6 flex items-end justify-center gap-4">
                {/* 2nd place */}
                <div className="flex flex-col items-center">
                  <Medal className="mb-1 h-6 w-6 text-gray-400" />
                  <div className="flex h-20 w-20 flex-col items-center justify-center rounded-lg bg-gray-50 border">
                    <span className="text-lg font-bold">{displayData[1].overallScore}</span>
                    <span className="truncate text-[10px] text-muted-foreground max-w-[72px] text-center">
                      {displayData[1].beraterName}
                    </span>
                  </div>
                </div>
                {/* 1st place */}
                <div className="flex flex-col items-center">
                  <Trophy className="mb-1 h-7 w-7 text-yellow-500" />
                  <div className="flex h-24 w-24 flex-col items-center justify-center rounded-lg bg-yellow-50 border border-yellow-200">
                    <span className="text-2xl font-bold text-yellow-700">{displayData[0].overallScore}</span>
                    <span className="truncate text-xs font-medium max-w-[88px] text-center">
                      {displayData[0].beraterName}
                    </span>
                  </div>
                </div>
                {/* 3rd place */}
                <div className="flex flex-col items-center">
                  <Award className="mb-1 h-6 w-6 text-amber-600" />
                  <div className="flex h-16 w-20 flex-col items-center justify-center rounded-lg bg-amber-50 border border-amber-200">
                    <span className="text-lg font-bold text-amber-700">{displayData[2].overallScore}</span>
                    <span className="truncate text-[10px] text-muted-foreground max-w-[72px] text-center">
                      {displayData[2].beraterName}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="space-y-1">
              {/* Header */}
              {!compact && (
                <div className="grid grid-cols-[40px_1fr_60px_70px_70px_60px_60px_32px] items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
                  <span>#</span>
                  <span>Name</span>
                  <span className="text-center">Score</span>
                  <span className="text-center">SLA</span>
                  <span className="text-center">Kontakt</span>
                  <span className="text-center">Termine</span>
                  <span className="text-center">Abschl.</span>
                  <span />
                </div>
              )}
              {displayData.map((rep) => {
                const isCurrentUser = rep.beraterId === currentUserId
                return (
                  <div
                    key={rep.beraterId}
                    className={cn(
                      "rounded-lg px-3 py-2.5 transition-colors",
                      isCurrentUser
                        ? "bg-blue-50 border border-blue-200"
                        : "hover:bg-muted/50",
                      compact
                        ? "grid grid-cols-[28px_1fr_60px_32px] items-center gap-2"
                        : "grid grid-cols-[40px_1fr_60px_70px_70px_60px_60px_32px] items-center gap-2"
                    )}
                  >
                    <div className="flex items-center justify-center">
                      <RankIcon rank={rep.rank ?? 0} />
                    </div>
                    <span className={cn("truncate text-sm", isCurrentUser ? "font-semibold" : "font-medium")}>
                      {rep.beraterName}
                      {isCurrentUser && (
                        <span className="ml-1.5 text-xs text-blue-600">(Du)</span>
                      )}
                    </span>
                    <div className="flex justify-center">
                      <ScoreBadge score={rep.overallScore} />
                    </div>
                    {!compact && (
                      <>
                        <span className="text-center text-sm text-muted-foreground">
                          {rep.slaRate}%
                        </span>
                        <span className="text-center text-sm text-muted-foreground">
                          {rep.contactRate}%
                        </span>
                        <span className="text-center text-sm text-muted-foreground">
                          {rep.appointmentsSet}
                        </span>
                        <span className="text-center text-sm text-muted-foreground">
                          {rep.closedDeals}
                        </span>
                      </>
                    )}
                    <div className="flex justify-center">
                      <TrendIcon trend={rep.trend} />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
