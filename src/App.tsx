import { GameProvider } from './context/GameContext';
import { WeatherWidget } from './components/WeatherWidget';
import { ZoneMap } from './components/ZoneMap';
import { GeneratorsPanel } from './components/GeneratorsPanel';
import { LeftPanel } from './components/LeftPanel';
import { ContractsPanel } from './components/ContractsPanel';

function App() {
  return (
    <GameProvider>
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20">
        <WeatherWidget />

        <main className="flex-1 overflow-hidden">
          <div className="h-full grid grid-cols-1 md:grid-cols-12 gap-0 md:divide-x divide-y md:divide-y-0">
            {/* Left Panel: Balance & Stats */}
            <div className="md:col-span-3 h-[30vh] md:h-[calc(100vh-80px)] overflow-y-auto">
              <LeftPanel />
            </div>

            {/* Center: Construction Site */}
            <div className="md:col-span-6 h-[40vh] md:h-[calc(100vh-80px)] flex flex-col relative">
              <ZoneMap />
            </div>

            {/* Right Panel: Generators & Contracts */}
            <div className="md:col-span-3 h-[30vh] md:h-[calc(100vh-80px)] flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                <GeneratorsPanel />
              </div>
              <div className="h-1/3 border-t bg-card/50">
                <ContractsPanel />
              </div>
            </div>
          </div>
        </main>
      </div>
    </GameProvider>
  );
}

export default App;
