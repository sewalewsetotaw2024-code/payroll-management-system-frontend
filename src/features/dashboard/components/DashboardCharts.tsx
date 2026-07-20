import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { TREND_DATA, TAX_DEDUCTION_DATA, DEPT_COST_DATA, CHART_COLORS } from '../constants';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-dark p-4 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-xl">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }}></div>
            <span className="text-sm font-bold text-white font-mono">
              {typeof p.value === 'number' && p.value > 1000 ? `ETB ${p.value.toLocaleString()}` : p.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const PayrollTrendsChart: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-card p-8 h-full flex flex-col group"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">Payroll Velocity</h3>
          <p className="text-xs text-slate-500 font-medium">Monthly disbursement trajectory</p>
        </div>
        <select className="glass border-none rounded-xl text-xs font-bold px-4 py-2 focus:ring-2 focus:ring-brand-primary/20 focus:outline-none cursor-pointer">
          <option>Q1 - Q2 2026</option>
          <option>Previous Year</option>
        </select>
      </div>
      <div className="h-[320px] w-full mt-auto">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={TREND_DATA}>
            <defs>
              <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
              dy={15}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
              tickFormatter={(value) => `${value/1000}k`}
              dx={-10}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="amount" 
              stroke="var(--color-brand-700)" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorAmount)"
              dot={{ r: 4, fill: 'var(--color-brand-700)', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, fill: 'var(--color-brand-700)', strokeWidth: 2, stroke: '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export const TaxDistributionChart: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card p-8 h-full flex flex-col"
    >
      <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-1">Compliance</h3>
      <p className="text-xs text-slate-500 font-medium mb-6">Tax & Statutory distribution</p>
      <div className="h-[240px] w-full flex items-center justify-center relative flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={TAX_DEDUCTION_DATA}
              innerRadius={70}
              outerRadius={95}
              paddingAngle={8}
              dataKey="value"
              stroke="transparent"
            >
              {TAX_DEDUCTION_DATA.map((_, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                  className="hover:opacity-80 transition-opacity cursor-pointer outline-none" 
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold text-slate-900 font-mono leading-none tracking-tighter">100%</span>
          <span className="text-[9px] text-slate-400 uppercase tracking-[0.2em] font-bold mt-1">Verified</span>
        </div>
      </div>
      <div className="mt-8 space-y-3">
        {TAX_DEDUCTION_DATA.map((item, index) => (
          <div key={item.name} className="flex items-center justify-between group cursor-default">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: CHART_COLORS[index] }}></div>
              <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{item.name}</span>
            </div>
            <span className="text-xs font-bold text-slate-900 font-mono bg-slate-50 px-2 py-0.5 rounded-lg">{item.value}%</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export const DeptCostChart: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card p-8 h-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">Department Costs</h3>
          <p className="text-xs text-slate-500 font-medium">Regional expenditure breakdown</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-brand-primary bg-brand-primary/10 px-4 py-2 rounded-xl uppercase tracking-widest">
          ETB 14.3M Total
        </div>
      </div>
      <div className="h-[300px] w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={DEPT_COST_DATA}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
              dy={15}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
              tickFormatter={(value) => `${value}M`}
              dx={-10}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(241, 245, 249, 0.5)', radius: 12 }} />
            <Bar 
              dataKey="cost" 
              radius={[12, 12, 12, 12]} 
              barSize={44}
            >
              {DEPT_COST_DATA.map((_, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={index === 0 ? '#022c22' : '#10b981'}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export const DashboardCharts: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 h-full">
        <PayrollTrendsChart />
      </div>
      <div className="lg:col-span-4 h-full">
        <TaxDistributionChart />
      </div>
      <div className="lg:col-span-12">
        <DeptCostChart />
      </div>
    </div>
  );
};

