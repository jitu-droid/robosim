'use client';

export default function AppHeader() {
  return (
    <header
      id="home"
      className="page-section opacity-0 transform translate-y-[30px] transition-opacity duration-1000 ease-out"
    >
      <div className="relative">
        <p className="section-title flex items-center gap-2" data-animate>
          <span className="inline-block w-12 h-[2px] bg-primary"></span>
          Robot Path Planning
        </p>
        <h1 className="super-heading" data-animate>
          Design, plan, and{' '}
          <span className="bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent animate-pulse">
            simulate
          </span>{' '}
          robot movements
        </h1>
        <p className="sub-heading" data-animate>
          Advanced algorithms for optimal path planning. Create robots, visualize simulations, and analyze
          performance with a modern, intuitive interface.
        </p>
        
        {/* Decorative elements */}
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10"></div>
        <div className="absolute top-20 -left-20 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl -z-10"></div>
      </div>
    </header>
  );
}
