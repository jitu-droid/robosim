'use client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function RobotsSection() {
  const { toast } = useToast();

  const handleCreateRobot = () => {
    toast({
      title: "Robot Created",
      description: "Your new robot has been successfully configured.",
    });
  };

  return (
    <section id="robots" className="page-section opacity-0 transform translate-y-[30px] transition-opacity duration-1000 ease-out">
      <div className="p-10 bg-gradient-to-br from-background via-background to-primary/5 border border-border rounded-lg shadow-xl shadow-primary/5 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300">
        <div className="flex items-center gap-3 mb-4" data-animate>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <h2 className="section-title mb-0">Create New Robot</h2>
            <p className="text-xs text-muted-foreground">Configure a new robot for your environment</p>
          </div>
        </div>
        
  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 mb-10 mt-8" data-animate>
          <div className="relative group">
            <label htmlFor="robot-name" className="block text-xs uppercase tracking-[1.5px] text-muted-foreground mb-3 group-hover:text-primary transition-colors">
              Robot Name
            </label>
            <input 
              type="text" 
              id="robot-name" 
              className="form-input hover:border-primary/50 focus:border-primary focus:shadow-lg focus:shadow-primary/20 transition-all" 
              placeholder="e.g., Mobile Bot 1" 
            />
          </div>
          <div className="relative group">
            <label htmlFor="robot-type" className="block text-xs uppercase tracking-[1.5px] text-muted-foreground mb-3 group-hover:text-primary transition-colors">
              Robot Type
            </label>
            <Select defaultValue="mobile">
              <SelectTrigger id="robot-type" className="h-12 bg-background/60 border-border">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mobile">Mobile Robot</SelectItem>
                <SelectItem value="manipulator">Manipulator</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="relative group">
            <label htmlFor="max-speed" className="block text-xs uppercase tracking-[1.5px] text-muted-foreground mb-3 group-hover:text-primary transition-colors">
              Max Speed (m/s)
            </label>
            <input 
              type="number" 
              id="max-speed" 
              className="form-input hover:border-primary/50 focus:border-primary focus:shadow-lg focus:shadow-primary/20 transition-all" 
              defaultValue="5" 
            />
          </div>
          <div className="relative group">
            <label htmlFor="max-accel" className="block text-xs uppercase tracking-[1.5px] text-muted-foreground mb-3 group-hover:text-primary transition-colors">
              Max Acceleration (m/s²)
            </label>
            <input 
              type="number" 
              id="max-accel" 
              className="form-input hover:border-primary/50 focus:border-primary focus:shadow-lg focus:shadow-primary/20 transition-all" 
              defaultValue="2" 
            />
          </div>
        </div>
        <Button 
          onClick={handleCreateRobot} 
          className="w-full bg-foreground text-background font-bold text-base py-7 hover:bg-white/80 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg hover:shadow-xl" 
          variant="secondary"
          data-animate
        >
          <span className="mr-2">✨</span>
          Create Robot
        </Button>
      </div>
    </section>
  );
}
