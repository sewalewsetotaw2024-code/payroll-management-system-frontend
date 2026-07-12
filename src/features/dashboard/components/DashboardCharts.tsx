import React from 'react';
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

export const PayrollTrendsChart: React.FC = () => {
  return (
    <div className="glass-card p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="font-bold text-slate-800">Payroll Trends</h3>
          <p className="text-sm text-slate-500">Monthly gross disbursement</p>
        </div>
        <select className="bg-slate-50 border border-slate-100 rounded-lg text-sm px-3 py-1.5 focus:outline-none">
          <option>Last 6 Months</option>
          <option>Last Year</option>
        </select>
      </div>
      <div className="h-[300px] w-full mt-auto">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={TREND_DATA}>
            <defs>
              <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#047857" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#047857" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickFormatter={(value) => `${value/1000}k`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="amount" 
              stroke="#047857" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorAmount)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const TaxDistributionChart: React.FC = () => {
  return (
    <div className="glass-card p-6 h-full flex flex-col">
      <h3 className="font-bold text-slate-800 mb-2 text-balance">Tax & Deduction Distribution</h3>
      <p className="text-sm text-slate-500 mb-4">Current period distribution</p>
      <div className="h-[250px] w-full flex items-center justify-center relative flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={TAX_DEDUCTION_DATA}
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {TAX_DEDUCTION_DATA.map((_, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-slate-800">100%</span>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Statutory</span>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {TAX_DEDUCTION_DATA.map((item, index) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[index] }}></div>
              <span className="text-xs text-slate-600 truncate max-w-[140px]">{item.name}</span>
            </div>
            <span className="text-xs font-semibold text-slate-800">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const DeptCostChart: React.FC = () => {
  return (
    <div className="glass-card p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="font-bold text-slate-800">Department-wise Cost</h3>
          <p className="text-sm text-slate-500">Total payroll expenditure in ETB Millions</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full uppercase">
          Total: 14.3M
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
              tick={{ fill: '#64748b', fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickFormatter={(value) => `${value}M`}
            />
            <Tooltip 
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
            />
            <Bar 
              dataKey="cost" 
              fill="#047857" 
              radius={[4, 4, 0, 0]} 
              barSize={40}
            >
              {DEPT_COST_DATA.map((_, index) => (
                <Cell key={`cell-${index}`} fill={index === 0 ? '#022c22' : '#047857'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const DashboardCharts: React.FC = () => {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <PayrollTrendsChart />
        </div>
        <div>
          <TaxDistributionChart />
        </div>
      </div>
      <DeptCostChart />
    </>
  );
};

