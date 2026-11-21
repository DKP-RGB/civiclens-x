import * as React from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DailyWeather, HourlyWeather } from '@/types'

const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 11,
  color: 'hsl(var(--foreground))',
  boxShadow: '0 8px 24px -12px rgb(0 0 0 / 0.25)',
}

const hourFormatter = new Intl.DateTimeFormat('en-IN', { hour: 'numeric' })
const dayFormatter = new Intl.DateTimeFormat('en-IN', { weekday: 'short' })

export function RainfallChart({
  hours,
  height = 180,
  hoursToShow = 48,
}: {
  hours: HourlyWeather[]
  height?: number
  hoursToShow?: number
}) {
  const gradientId = React.useId().replace(/[^a-zA-Z0-9]/g, '')
  const data = hours.slice(0, hoursToShow).map((hour) => ({
    time: hourFormatter.format(new Date(hour.time)),
    rain: hour.rainfallMm,
    probability: hour.probability,
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 4, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.32} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          interval={Math.max(3, Math.floor(data.length / 8))}
          axisLine={false}
          tickLine={false}
          tickMargin={6}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          width={38}
          tickFormatter={(value: number) => `${value}`}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          formatter={(value, name) =>
            name === 'rain' ? [`${value} mm`, 'Rainfall'] : [value, name]
          }
        />
        <Area
          type="monotone"
          dataKey="rain"
          stroke="hsl(var(--primary))"
          strokeWidth={1.8}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function DailyRainfallChart({ daily, height = 130 }: { daily: DailyWeather[]; height?: number }) {
  const data = daily.map((day) => ({
    day: dayFormatter.format(new Date(day.date)),
    rain: day.rainfallMm,
  }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 4, left: -22, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          tickMargin={6}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          width={34}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: 'hsl(var(--muted) / 0.5)' }}
          formatter={(value) => [`${value} mm`, 'Rainfall']}
        />
        <Bar dataKey="rain" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer>
  )
}
