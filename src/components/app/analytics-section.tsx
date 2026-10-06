'use client';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const kpis = [
    { value: "156", label: "Total Simulations", change: "+12% from last week", trend: "up", icon: "🎯" },
    { value: "13.2", unit: "m", label: "Avg Path Distance", change: "-2.1% improvement", trend: "down", icon: "📏" },
    { value: "92", unit: "%", label: "Success Rate", change: "+3% from last week", trend: "up", icon: "✅" },
    { value: "42", unit: "ms", label: "Avg Computation", change: "-8% faster", trend: "down", icon: "⚡" },
]

const barChartData = [
    { name: 'A*', Distance: 12.5, Efficiency: 92, Time: 45 },
    { name: 'RRT', Distance: 14.2, Efficiency: 85, Time: 38 },
    { name: 'Potential Fields', Distance: 13.8, Efficiency: 88, Time: 52 },
];
const lineChartData = [
    { name: '1', Distance: 15, Efficiency: 80 },
    { name: '2', Distance: 14, Efficiency: 85 },
    { name: '3', Distance: 13.5, Efficiency: 88 },
    { name: '4', Distance: 13.2, Efficiency: 91 },
    { name: '5', Distance: 13.2, Efficiency: 92 },
];


export default function AnalyticsSection() {
  return (
    <section id="analytics" className="page-section opacity-0 transform translate-y-[30px] transition-opacity duration-1000 ease-out">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {kpis.map(kpi => (
                 <div 
                   key={kpi.label} 
                   className="relative overflow-hidden border border-border p-8 rounded-lg bg-gradient-to-br from-background via-background to-primary/5 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 group reveal"
                 >
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -z-10 group-hover:bg-primary/10 transition-all"></div>
                    
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-3xl group-hover:scale-110 transition-transform">{kpi.icon}</span>
                      <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                        kpi.trend === 'up' ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-500'
                      }`}>
                        {kpi.trend === 'up' ? '↑' : '↓'}
                      </div>
                    </div>
                    
                    <p className="text-5xl font-bold mb-2 group-hover:text-primary transition-colors">
                        {kpi.value}
                        {kpi.unit && <span className="text-2xl text-muted-foreground ml-1">{kpi.unit}</span>}
                    </p>
                    <p className="text-xs uppercase tracking-[1.5px] text-muted-foreground mb-2">{kpi.label}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {kpi.change}
                    </p>
                </div>
            ))}
        </div>

  <div className="p-10 mb-8 bg-gradient-to-br from-background via-background to-primary/5 border border-border rounded-lg hover:border-primary/30 transition-all duration-300" data-animate>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xl">📊</span>
              </div>
              <div>
                <h2 className="section-title mb-0">Algorithm Comparison</h2>
                <p className="text-xs text-muted-foreground">Performance metrics across different path planning algorithms</p>
              </div>
            </div>
            
            <div className="h-[350px] mb-12 rounded-lg overflow-hidden bg-background/50 p-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData}>
                        <CartesianGrid stroke="#333" strokeDasharray="3 3" />
                        <XAxis dataKey="name" stroke="#888" />
                        <YAxis stroke="#888" />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#111',
                                borderColor: '#333',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                            }}
                            labelStyle={{ color: '#fff' }}
                        />
                        <Legend wrapperStyle={{ color: '#fff' }} />
                        <Bar dataKey="Time" fill="hsl(var(--foreground))" name="Time (ms)" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="Distance" fill="hsl(var(--primary))" name="Distance (m)" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="Efficiency" fill="#888888" name="Efficiency (%)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
        
  <div className="p-10 bg-gradient-to-br from-background via-background to-purple-500/5 border border-border rounded-lg hover:border-primary/30 transition-all duration-300" data-animate>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xl">📈</span>
              </div>
              <div>
                <h2 className="section-title mb-0">Performance Over Time</h2>
                <p className="text-xs text-muted-foreground">Path optimization improvements across iterations</p>
              </div>
            </div>
            
             <div className="h-[350px] rounded-lg overflow-hidden bg-background/50 p-4">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineChartData}>
                         <CartesianGrid stroke="#333" strokeDasharray="3 3" />
                        <XAxis dataKey="name" stroke="#888" />
                        <YAxis stroke="#888" />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#111',
                                borderColor: '#333',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                            }}
                            labelStyle={{ color: '#fff' }}
                        />
                        <Legend wrapperStyle={{ color: '#fff' }} />
                        <Line type="monotone" dataKey="Distance" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: 'hsl(var(--primary))', r: 5 }} />
                        <Line type="monotone" dataKey="Efficiency" stroke="hsl(var(--foreground))" strokeWidth={3} dot={{ fill: 'hsl(var(--foreground))', r: 5 }} />
                    </LineChart>
                </ResponsiveContainer>
             </div>
        </div>

    </section>
  );
}
