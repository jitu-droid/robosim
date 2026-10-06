'use client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PlanningSection() {
    const { toast } = useToast();

    const handlePlanPath = () => {
        toast({
            title: "Path Planned",
            description: "Optimal path has been generated successfully.",
        });
    }

  return (
    <section id="planning" className="page-section opacity-0 transform translate-y-[30px] transition-opacity duration-1000 ease-out">
      <div className="p-10 bg-gradient-to-br from-background via-background to-purple-500/5 border border-border rounded-lg shadow-xl shadow-purple-500/5 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300">
        <div className="flex items-center gap-3 mb-4" data-animate>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-2xl">🗺️</span>
          </div>
          <div>
            <h2 className="section-title mb-0">Path Planning</h2>
            <p className="text-xs text-muted-foreground">Plan optimal paths using different algorithms</p>
          </div>
        </div>
        
        <form className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 mb-10" data-animate>
            <div className="relative group">
              <label htmlFor="algorithm" className="block text-xs uppercase tracking-[1.5px] text-muted-foreground mb-3 group-hover:text-primary transition-colors">
                Algorithm
              </label>
              <Select defaultValue="astar">
                <SelectTrigger id="algorithm" className="h-12 bg-background/60 border-border">
                  <SelectValue placeholder="Select algorithm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="astar">A* Pathfinding</SelectItem>
                  <SelectItem value="rrt">RRT</SelectItem>
                  <SelectItem value="potential">Potential Fields</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div />
            <div className="group">
              <label className="block text-xs uppercase tracking-[1.5px] text-muted-foreground mb-3 flex items-center gap-2 group-hover:text-primary transition-colors">
                <span className="text-base">📍</span>
                Start Position
              </label>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <input type="number" className="form-input hover:border-primary/50 focus:border-primary transition-all" defaultValue="0" />
                  <span className="absolute right-2 top-2 text-xs text-muted-foreground">X</span>
                </div>
                <div className="relative flex-1">
                  <input type="number" className="form-input hover:border-primary/50 focus:border-primary transition-all" defaultValue="0" />
                  <span className="absolute right-2 top-2 text-xs text-muted-foreground">Y</span>
                </div>
                <div className="relative flex-1">
                  <input type="number" className="form-input hover:border-primary/50 focus:border-primary transition-all" defaultValue="0" />
                  <span className="absolute right-2 top-2 text-xs text-muted-foreground">Z</span>
                </div>
              </div>
            </div>
            <div className="group">
              <label className="block text-xs uppercase tracking-[1.5px] text-muted-foreground mb-3 flex items-center gap-2 group-hover:text-primary transition-colors">
                <span className="text-base">🎯</span>
                Goal Position
              </label>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <input type="number" className="form-input hover:border-primary/50 focus:border-primary transition-all" defaultValue="5" />
                  <span className="absolute right-2 top-2 text-xs text-muted-foreground">X</span>
                </div>
                <div className="relative flex-1">
                  <input type="number" className="form-input hover:border-primary/50 focus:border-primary transition-all" defaultValue="5" />
                  <span className="absolute right-2 top-2 text-xs text-muted-foreground">Y</span>
                </div>
                <div className="relative flex-1">
                  <input type="number" className="form-input hover:border-primary/50 focus:border-primary transition-all" defaultValue="0" />
                  <span className="absolute right-2 top-2 text-xs text-muted-foreground">Z</span>
                </div>
              </div>
            </div>
          </div>
          <Button 
            onClick={handlePlanPath} 
            className="w-full bg-foreground text-background font-bold text-base py-7 hover:bg-white/80 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg hover:shadow-xl" 
            variant="secondary"
            data-animate
          >
            <span className="mr-2">🚀</span>
            Plan Path
          </Button>
        </form>
      </div>
    </section>
  );
}
