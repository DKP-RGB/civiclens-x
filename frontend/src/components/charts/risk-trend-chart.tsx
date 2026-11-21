import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export interface TrendPoint {
  label: string
  waterlogging: number
  road: number
}

export function RiskTrendChart({ data, height = 160 }: { data: TrendPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          tickMargin={6}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          width={38}
          tickFormatter={(value: number) => `${value}%`}
        />
        <Tooltip
          contentStyle={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 8,
            fontSize: 11,
            color: 'hsl(var(--foreground))',
          }}
          formatter={(value, name) => [
            `${value}%`,
            name === 'waterlogging' ? 'Waterlogging' : 'Road deterioration',
          ]}
        />
        <Line
          type="monotone"
          dataKey="waterlogging"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0 }}
        />
        <Line
          type="monotone"
          dataKey="road"
          stroke="#f97316"
          strokeWidth={1.6}
          strokeDasharray="4 3"
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
