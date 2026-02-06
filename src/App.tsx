import { GameProvider } from './context/GameContext';
import { WeatherWidget } from './components/WeatherWidget';
import { ZoneMap } from './components/ZoneMap';
import { GeneratorsPanel } from './components/GeneratorsPanel';
import { LeftPanel } from './components/LeftPanel';

function App() {
  return (
    <GameProvider>
      <div className="dark min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20">
        <WeatherWidget />

        <main className="flex-1 overflow-hidden">
          <div className="h-full grid grid-cols-1 md:grid-cols-12 gap-0 md:divide-x divide-y md:divide-y-0">
            {/* Left Panel: Balance & Stats */}
            <div className="md:col-span-3 h-[30vh] md:h-[calc(100vh-72px)] overflow-y-auto">
              <span className="sr-only">Stats Panel</span>
              <LeftPanel />
            </div>


            {/* Center: Construction Site */}
            <div className="md:col-span-6 h-[40vh] md:h-[calc(100vh-72px)] flex flex-col relative">
              <ZoneMap />
            </div>

            {/* Right Panel: Generators & Contracts */}
            <div className="md:col-span-3 h-[30vh] md:h-[calc(100vh-72px)] flex flex-col overflow-hidden bg-[#050505] border-l border-white/5">
              <div className="flex-1 overflow-y-auto">
                <GeneratorsPanel />
              </div>
              {/* TODO: Re-enable contracts later */}
              {/* <div className="h-1/3 border-t bg-[#0a0a0a]">
                <ContractsPanel />
              </div> */}
            </div>
          </div>
        </main>
      </div>
    </GameProvider>
  );
}

export default App;
