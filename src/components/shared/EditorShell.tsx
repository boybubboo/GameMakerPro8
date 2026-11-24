import React, { Profiler, useEffect, useRef, useState } from 'react';
import {
  Box,
  ChevronDown,
  ChevronLeft,
  Clapperboard,
  CloudSun,
  FileArchive,
  Globe,
  Layers,
  Lightbulb,
  Map as MapIcon,
  Mountain,
  Paintbrush,
  Play,
  Plus,
  Redo2,
  Save,
  Shapes,
  Sparkles,
  Sprout,
  Trash2,
  Trees,
  Undo2,
  User,
  Wand2,
  Workflow,
} from 'lucide-react';
import type { MakerStore } from '../../store/useMakerStore';
import type { StageTab } from '../../types/maker';
import { getEnvironmentType } from '../../utils/terrain';
import { WORLD_TERRAIN_YELLOW } from '../../utils/worldMap';
import { PlayModeView } from '../play/PlayModeView';
import { ActionsStage } from '../stages/ActionsStage';
import { CastStage } from '../stages/CastStage';
import { InterfaceStage } from '../stages/InterfaceStage';
import { LogicStage } from '../stages/LogicStage';
import { MotionStage } from '../stages/MotionStage';
import { PublishStage } from '../stages/PublishStage';
import { WorldStage } from '../stages/WorldStage';
import { AtmosphereDrawer } from '../world/AtmosphereDrawer';
import { CanopyEngineModal } from '../world/CanopyEngineModal';
import { CharacterMakerModal } from '../world/CharacterMakerModal';
import { ObjectMakerModal } from '../world/ObjectMakerModal';
import { PlantMakerModal } from '../world/PlantMakerModal';
import { TextureStudioModal } from '../world/TextureStudioModal';
import { VertexPaintModal } from '../world/VertexPaintModal';
import { AssetVaultModal } from './AssetVaultModal';
import { EntityAttributeModal } from './EntityAttributeModal';
import { ExportProjectZipModal } from './ExportProjectZipModal';
import { MakerIcon } from './IconMap';
import { IdeasModal } from './IdeasModal';
import { LogicFlowModal } from './LogicFlowModal';
import { ThemeToggle } from './MakerUI';
import { PersistentMinimapHUD } from './PersistentMinimapHUD';
import { PostProcessingMenuModal } from './PostProcessingMenuModal';
import { SavePresetsModal } from './SavePresetsModal';
import {
  detectTimeOfDayPreset,
  SkyboxLightingEditorModal,
  TimeOfDayIcon,
} from './SkyboxLightingEditorModal';
import { StoryDirectorModal } from './StoryDirectorModal';
import { TerrainEditorModal } from './TerrainEditorModal';
import {
  onEditorProfilerRender,
  useEditorResourceMonitor,
} from '../../utils/resourceMonitor';

const STAGE_TABS: { id: StageTab; title: string; symbol: string }[] = [
  { id: 'world', title: 'World', symbol: 'map.fill' },
  { id: 'cast', title: 'Cast', symbol: 'person.2.fill' },
  { id: 'motion', title: 'Motion', symbol: 'motion.studio' },
  { id: 'logic', title: 'Logic', symbol: 'arrow.triangle.branch' },
  { id: 'actions', title: 'Actions', symbol: 'figure.run' },
  { id: 'interface', title: 'Interface', symbol: 'slider.horizontal.3' },
  { id: 'publish', title: 'Publish', symbol: 'paperplane.fill' },
];

const AUTO_SAVE_DEBOUNCE_MS = 600;
const EDITOR_AUTOSAVE_META_KEY = 'maker.autosave.meta.v1';

export const EditorShell: React.FC<{ store: MakerStore }> = ({ store }) => {
  const { currentProject, currentLevel, levelIndex, saveProjectStateNow } = store;
  const [levelMenuOpen, setLevelMenuOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [showingExportZip, setShowingExportZip] = useState(false);

  const lastProjectIdRef = useRef<string | null>(null);
  const lastSeenProjectRef = useRef(currentProject);
  const pendingAutoSaveRef = useRef(false);
  const autoSaveTimerRef = useRef<number | null>(null);

  useEditorResourceMonitor({
    stage: store.selectedTab,
    projectId: currentProject?.id ?? null,
  });

  // Debounced auto-save: persists project state to localStorage after edits settle
  useEffect(() => {
    if (!currentProject) {
      lastProjectIdRef.current = null;
      lastSeenProjectRef.current = null;
      pendingAutoSaveRef.current = false;
      return;
    }

    if (lastProjectIdRef.current !== currentProject.id) {
      lastProjectIdRef.current = currentProject.id;
      lastSeenProjectRef.current = currentProject;
      pendingAutoSaveRef.current = false;
      return;
    }

    if (lastSeenProjectRef.current === currentProject) {
      return;
    }
    lastSeenProjectRef.current = currentProject;
    pendingAutoSaveRef.current = true;

    if (autoSaveTimerRef.current !== null) {
      window.clearTimeout(autoSaveTimerRef.current);
    }

    const levelId = currentLevel?.id ?? null;
    const tab = store.selectedTab;
    const projectId = currentProject.id;

    autoSaveTimerRef.current = window.setTimeout(() => {
      autoSaveTimerRef.current = null;
      pendingAutoSaveRef.current = false;
      saveProjectStateNow(true);
      try {
        localStorage.setItem(
          EDITOR_AUTOSAVE_META_KEY,
          JSON.stringify({
            projectId,
            levelId,
            tab,
            savedAt: new Date().toISOString(),
          })
        );
      } catch {
        // ignore localStorage quota errors
      }
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      if (autoSaveTimerRef.current !== null) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [currentProject, currentLevel?.id, store.selectedTab, saveProjectStateNow]);

  useEffect(() => {
    const flushPending = () => {
      if (!pendingAutoSaveRef.current) return;
      if (autoSaveTimerRef.current !== null) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      pendingAutoSaveRef.current = false;
      saveProjectStateNow(true);
    };
    window.addEventListener('pagehide', flushPending);
    return () => {
      window.removeEventListener('pagehide', flushPending);
      flushPending();
    };
  }, [saveProjectStateNow]);

  if (!currentProject) return null;

  const activeTimePreset = currentLevel ? detectTimeOfDayPreset(currentLevel) : 'noon';

  return (
    <div className="h-dvh min-h-0 flex flex-col bg-[#F4F5F8] dark:bg-[#0F1117] text-slate-900 dark:text-[#F3F5FA] overflow-hidden transition-colors">
      {/* Unified Top Bar: Project + Stage Tabs + Create / Atmosphere / Utilities / Play */}
      <Profiler id="EditorShell.Header" onRender={onEditorProfilerRender}>
        <header className="shrink-0 bg-white dark:bg-[#171A23] border-b border-slate-200/80 dark:border-white/[0.08] px-3 py-2 flex items-center gap-2 z-30">
          {/* Left: Back + Project + Level Switcher */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => store.closeProject()}
              title="All games"
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#1F2430] text-[#7C5CFF] flex items-center justify-center hover:bg-slate-200 dark:hover:bg-[#272D3C] shrink-0"
            >
              <ChevronLeft size={16} strokeWidth={2.6} />
            </button>

            <div className="hidden xl:block min-w-0 max-w-[140px]">
              <h1 className="text-sm font-black truncate leading-tight">
                {currentProject.name}
              </h1>
              <div className="text-[10px] font-semibold text-slate-500 dark:text-[#949BB0] tabular-nums">
                Level {levelIndex + 1}/{Math.max(1, currentProject.levels.length)}
              </div>
            </div>

            {/* Level Switcher */}
            {(() => {
              const hasOpenWorld = currentProject.levels.some(
                (l) => getEnvironmentType(l) === 'openWorld'
              );
              const isWmActive = hasOpenWorld && store.worldEditorScope === 'worldMap';
              const wmRegions = store.resolvedWorldMap?.regions ?? [];
              const activeRegion = currentLevel
                ? wmRegions.find((r) => r.levelId === currentLevel.id)
                : undefined;

              return (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setLevelMenuOpen((v) => !v);
                      setCreateMenuOpen(false);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1F2430] hover:bg-slate-200 dark:hover:bg-[#272D3C] text-xs font-bold whitespace-nowrap"
                  >
                    {isWmActive ? (
                      <Globe size={12} style={{ color: WORLD_TERRAIN_YELLOW }} />
                    ) : activeRegion ? (
                      <span
                        className="w-2.5 h-2.5 rounded-sm border border-black/20 shrink-0"
                        style={{ backgroundColor: activeRegion.colorHex }}
                      />
                    ) : (
                      <MapIcon size={12} className="text-[#7C5CFF]" />
                    )}
                    <span className="max-w-[100px] truncate">
                      {isWmActive ? 'World Map' : currentLevel?.name ?? 'Level'}
                    </span>
                    <ChevronDown size={11} />
                  </button>

                  {levelMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setLevelMenuOpen(false)}
                      />
                      <div className="absolute left-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#171A23] shadow-xl border border-slate-200/80 dark:border-white/[0.1] py-1.5 z-30">
                        {hasOpenWorld && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                store.enterWorldEditorScope('worldMap');
                                setLevelMenuOpen(false);
                              }}
                              className={`w-full flex items-center gap-2 px-3.5 py-2 text-left text-xs font-extrabold hover:bg-slate-100 dark:hover:bg-[#1F2430] ${
                                isWmActive ? 'text-[#7C5CFF]' : ''
                              }`}
                            >
                              <Globe size={12} style={{ color: WORLD_TERRAIN_YELLOW }} />
                              <span className="truncate flex-1">World Map (Overview)</span>
                            </button>
                            <div className="my-1 border-t border-slate-200/70 dark:border-white/[0.08]" />
                          </>
                        )}
                        {currentProject.levels
                          .filter((lvl) => {
                            if (!hasOpenWorld) return true;
                            if (
                              wmRegions.length === 0 &&
                              getEnvironmentType(lvl) === 'openWorld' &&
                              lvl.entities.length === 0 &&
                              (lvl.terrain?.scatter.length ?? 0) === 0
                            ) {
                              return false;
                            }
                            return true;
                          })
                          .map((lvl, idx) => {
                            const reg = wmRegions.find((r) => r.levelId === lvl.id);
                            const active = !isWmActive && lvl.id === currentLevel?.id;
                            return (
                              <button
                                key={lvl.id}
                                type="button"
                                onClick={() => {
                                  store.enterWorldEditorScope(lvl.id);
                                  setLevelMenuOpen(false);
                                }}
                                className={`w-full flex items-center gap-2 px-3.5 py-2 text-left text-xs font-semibold hover:bg-slate-100 dark:hover:bg-[#1F2430] ${
                                  active ? 'text-[#7C5CFF] font-bold' : ''
                                }`}
                              >
                                {reg ? (
                                  <span
                                    className="w-2.5 h-2.5 rounded-sm border border-black/20 shrink-0"
                                    style={{ backgroundColor: reg.colorHex }}
                                  />
                                ) : (
                                  <span className="w-4 text-[11px] text-slate-400 tabular-nums">
                                    {idx + 1}.
                                  </span>
                                )}
                                <span className="truncate flex-1">{reg?.name ?? lvl.name}</span>
                              </button>
                            );
                          })}
                        <div className="my-1 border-t border-slate-200/70 dark:border-white/[0.08]" />
                        <button
                          type="button"
                          onClick={() => {
                            if (hasOpenWorld) {
                              const created = store.addWorldLandRegion();
                              if (created) store.enterWorldEditorScope(created.levelId);
                            } else {
                              store.addLevel();
                            }
                            setLevelMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3.5 py-2 text-left text-xs font-bold text-[#7C5CFF] hover:bg-[#7C5CFF]/10"
                        >
                          <Plus size={13} />
                          <span>{hasOpenWorld ? 'Add a Land / Level' : 'Add a level'}</span>
                        </button>
                    {currentProject.levels.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          store.deleteCurrentLevel();
                          setLevelMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3.5 py-2 text-left text-xs font-bold text-[#F2545B] hover:bg-[#F2545B]/10"
                      >
                        <Trash2 size={13} />
                        <span>Delete current level</span>
                      </button>
                    )}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Center: Inline Stage Tabs */}
          <nav
            aria-label="Editor Stages"
            className="flex-1 min-w-0 overflow-x-auto maker-scroll"
          >
            <div className="flex items-center gap-1 min-w-max mx-auto px-1">
              {STAGE_TABS.map((tab) => {
                const active = store.selectedTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => store.setSelectedTab(tab.id)}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 whitespace-nowrap ${
                      active
                        ? 'bg-[#7C5CFF] text-white shadow-xs'
                        : 'text-slate-600 dark:text-[#949BB0] hover:bg-slate-100 dark:hover:bg-[#1F2430] hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <MakerIcon
                      symbol={tab.symbol}
                      size={13}
                      color={active ? '#FFFFFF' : 'currentColor'}
                    />
                    <span>{tab.title}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Right: Create Menu + Atmosphere + Global Utilities + Play */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Global Create Maker Studio Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setCreateMenuOpen((v) => !v);
                  setLevelMenuOpen(false);
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-colors ${
                  createMenuOpen
                    ? 'bg-[#7C5CFF] text-white'
                    : 'bg-[#7C5CFF]/15 text-[#7C5CFF] hover:bg-[#7C5CFF]/25'
                }`}
              >
                <Wand2 size={13} />
                <span>Create</span>
                <ChevronDown size={11} />
              </button>

              {createMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setCreateMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white dark:bg-[#171A23] shadow-2xl border border-slate-200/80 dark:border-white/[0.1] py-1.5 z-30">
                    <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Maker Studios
                    </div>
                    {[
                      {
                        label: 'Object Maker',
                        desc: 'Sculpt props & mechanisms',
                        Icon: Shapes,
                        color: '#7C5CFF',
                        action: () => store.openObjectMaker(),
                      },
                      {
                        label: 'Plant Maker',
                        desc: 'Leaves, fans & flowers',
                        Icon: Sprout,
                        color: '#20B46A',
                        action: () => store.openPlantMaker(),
                      },
                      {
                        label: 'Character Maker',
                        desc: 'Clay rig, morphs & voices',
                        Icon: User,
                        color: '#A855F7',
                        action: () => store.openCharacterMaker(),
                      },
                      {
                        label: 'Tree Maker',
                        desc: 'Canopy trunks & branches',
                        Icon: Trees,
                        color: '#16A34A',
                        action: () => store.openTreeMaker(),
                      },
                      {
                        label: 'Building Maker Kit',
                        desc: 'Modular walls, roofs & doors',
                        Icon: Box,
                        color: '#F59E0B',
                        action: () => {
                          store.setSelectedTab('world');
                          store.setActiveWorldDomain('buildings');
                          store.setWorldTool('add');
                        },
                      },
                    ].map((item) => {
                      const Icon = item.Icon;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => {
                            setCreateMenuOpen(false);
                            item.action();
                          }}
                          className="w-full px-3 py-2 flex items-center gap-2.5 text-left hover:bg-slate-100 dark:hover:bg-[#1F2430]"
                        >
                          <span
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${item.color}20`, color: item.color }}
                          >
                            <Icon size={14} />
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold leading-tight">{item.label}</div>
                            <div className="text-[10px] text-slate-500 dark:text-[#949BB0]">
                              {item.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    <div className="my-1 border-t border-slate-200/70 dark:border-white/[0.08]" />
                    <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Surfaces &amp; Tools
                    </div>
                    {[
                      {
                        label: 'Texture Maker',
                        Icon: Layers,
                        color: '#7C5CFF',
                        action: () => store.setShowingTextureStudio(true),
                      },
                      {
                        label: 'FX Library',
                        Icon: Sparkles,
                        color: '#F59E0B',
                        action: () => {
                          store.setSelectedTab('world');
                          store.setShowingFxLibrary(true);
                        },
                      },
                      {
                        label: 'Vertex Paint',
                        Icon: Paintbrush,
                        color: '#EC4899',
                        action: () =>
                          store.setVertexPaintTarget(store.selectedEntityID ?? 'forestTree'),
                      },
                      {
                        label: 'Terrain Heightmap',
                        Icon: Mountain,
                        color: '#20B46A',
                        action: () => store.setShowingTerrainEditor(true),
                      },
                    ].map((item) => {
                      const Icon = item.Icon;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => {
                            setCreateMenuOpen(false);
                            item.action();
                          }}
                          className="w-full px-3 py-1.5 flex items-center gap-2 text-left text-xs font-bold hover:bg-slate-100 dark:hover:bg-[#1F2430]"
                        >
                          <Icon size={13} style={{ color: item.color }} />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Atmosphere, Sky, Style & Distant Vista Drawer */}
            <button
              type="button"
              onClick={() => store.setShowingAtmosphereDrawer(!store.showingAtmosphereDrawer)}
              title="Atmosphere, Time of Day, Skybox, Style & Distant Vista"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold shrink-0 whitespace-nowrap transition-colors ${
                store.showingAtmosphereDrawer
                  ? 'bg-[#38BDF8]/20 text-[#0284C7] dark:text-[#38BDF8] ring-1 ring-[#38BDF8]/40'
                  : 'bg-slate-100 dark:bg-[#1F2430] hover:bg-slate-200 dark:hover:bg-[#272D3C]'
              }`}
            >
              <TimeOfDayIcon
                preset={activeTimePreset}
                size={13}
                className={
                  activeTimePreset === 'night'
                    ? 'text-[#818CF8]'
                    : activeTimePreset === 'noon'
                    ? 'text-[#0EA5E9] dark:text-[#38BDF8]'
                    : 'text-[#F59E0B]'
                }
              />
              <span className="hidden md:inline">Atmosphere</span>
              <CloudSun size={11} className="hidden sm:inline opacity-70" />
            </button>

            <button
              type="button"
              onClick={() => store.setShowingLogicFlow(true)}
              title="Logic Flow — Node-based rule graph"
              className="hidden xl:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1F2430] hover:bg-slate-200 dark:hover:bg-[#272D3C] text-xs font-bold shrink-0 whitespace-nowrap"
            >
              <Workflow size={13} className="text-[#A855F7]" />
              <span>Flow</span>
            </button>

            <button
              type="button"
              onClick={() => store.setShowingDirector(true)}
              title="Story Director — Camera cutaways & skits"
              className="hidden xl:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1F2430] hover:bg-slate-200 dark:hover:bg-[#272D3C] text-xs font-bold shrink-0 whitespace-nowrap"
            >
              <Clapperboard size={13} className="text-[#F59E0B]" />
              <span>Director</span>
            </button>

            <button
              type="button"
              onClick={() => store.setShowingPresets(true)}
              title="Save & Load Presets"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1F2430] hover:bg-slate-200 dark:hover:bg-[#272D3C] text-xs font-bold shrink-0 whitespace-nowrap"
            >
              <Save size={13} className="text-[#20B46A]" />
              <span className="hidden 2xl:inline">Presets</span>
            </button>

            <button
              type="button"
              onClick={() => store.setShowingAssetVault(true)}
              title="3D Asset Vault (GLB)"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1F2430] hover:bg-slate-200 dark:hover:bg-[#272D3C] text-xs font-bold shrink-0 whitespace-nowrap"
            >
              <Box size={13} className="text-[#7C5CFF]" />
              <span className="tabular-nums text-[11px]">{store.customAssets.length}</span>
            </button>

            <button
              type="button"
              onClick={() => store.setShowingIdeas(true)}
              title="Ideas Coach"
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#1F2430] text-[#F59E0B] flex items-center justify-center hover:bg-slate-200 dark:hover:bg-[#272D3C] shrink-0"
            >
              <Lightbulb size={15} />
            </button>

            <div className="hidden lg:block">
              <ThemeToggle theme={store.theme} onChange={store.setTheme} compact />
            </div>

            <div className="hidden sm:flex items-center gap-1">
              <button
                type="button"
                disabled={!store.canUndo}
                onClick={() => store.undo()}
                title={store.canUndo ? `Undo ${store.undoLabel}` : 'Undo'}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#1F2430] flex items-center justify-center disabled:opacity-35 text-slate-500 dark:text-[#949BB0] hover:text-slate-900 dark:hover:text-white"
              >
                <Undo2 size={14} />
              </button>
              <button
                type="button"
                disabled={!store.canRedo}
                onClick={() => store.redo()}
                title="Redo"
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#1F2430] flex items-center justify-center disabled:opacity-35 text-slate-500 dark:text-[#949BB0] hover:text-slate-900 dark:hover:text-white"
              >
                <Redo2 size={14} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowingExportZip(true)}
              title="Export adventure ZIP"
              className="w-8 h-8 sm:w-auto sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-[#1F2430] hover:bg-slate-200 dark:hover:bg-[#272D3C] text-xs font-bold inline-flex items-center justify-center gap-1 shrink-0 whitespace-nowrap"
            >
              <FileArchive size={13} className="text-[#7C5CFF]" />
              <span className="hidden xl:inline">Export</span>
            </button>

            <button
              type="button"
              onClick={() => {
                store.setPlayFromPoint(null);
                store.setIsPlaying(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#20B46A] text-white text-xs font-extrabold hover:opacity-95 shadow-sm shadow-[#20B46A]/25 shrink-0 whitespace-nowrap"
            >
              <Play size={12} fill="currentColor" />
              <span>Play</span>
            </button>
          </div>
        </header>
      </Profiler>

      {/* Main Stage */}
      <Profiler id={`EditorShell.Stage.${store.selectedTab}`} onRender={onEditorProfilerRender}>
        <div className="flex-1 min-h-0 overflow-hidden">
          {store.selectedTab === 'world' && <WorldStage store={store} />}
          {store.selectedTab === 'cast' && <CastStage store={store} />}
          {store.selectedTab === 'motion' && <MotionStage store={store} />}
          {store.selectedTab === 'logic' && <LogicStage store={store} />}
          {store.selectedTab === 'actions' && <ActionsStage store={store} />}
          {store.selectedTab === 'interface' && <InterfaceStage store={store} />}
          {store.selectedTab === 'publish' && <PublishStage store={store} />}
        </div>
      </Profiler>

      {/* Global Overlays, Drawers & Maker Studios */}
      <Profiler id="EditorShell.Overlays" onRender={onEditorProfilerRender}>
        <AtmosphereDrawer store={store} />
        <EntityAttributeModal store={store} />

        {store.showingIdeas && (
          <IdeasModal store={store} onClose={() => store.setShowingIdeas(false)} />
        )}

        {store.showingAssetVault && (
          <AssetVaultModal store={store} onClose={() => store.setShowingAssetVault(false)} />
        )}

        {store.showingPresets && (
          <SavePresetsModal store={store} onClose={() => store.setShowingPresets(false)} />
        )}

        {store.showingLogicFlow && (
          <LogicFlowModal store={store} onClose={() => store.setShowingLogicFlow(false)} />
        )}

        {store.showingDirector && (
          <StoryDirectorModal store={store} onClose={() => store.setShowingDirector(false)} />
        )}

        {store.showingSkybox && (
          <SkyboxLightingEditorModal
            store={store}
            onClose={() => store.setShowingSkybox(false)}
          />
        )}

        {store.showingTerrainEditor && (
          <TerrainEditorModal
            store={store}
            onClose={() => store.setShowingTerrainEditor(false)}
          />
        )}

        {store.showingPostFx && (
          <PostProcessingMenuModal
            store={store}
            onClose={() => store.setShowingPostFx(false)}
          />
        )}

        {store.showingTextureStudio && (
          <TextureStudioModal
            store={store}
            onClose={() => store.setShowingTextureStudio(false)}
          />
        )}

        {store.vertexPaintTarget !== null && (
          <VertexPaintModal
            store={store}
            initialEntityId={
              store.vertexPaintTarget === 'forestTree' ? null : store.vertexPaintTarget
            }
            onClose={() => store.setVertexPaintTarget(null)}
          />
        )}

        {store.treeMakerOpen && (
          <CanopyEngineModal
            store={store}
            initialAssetId={store.treeMakerTargetAssetId}
            initialSpecies={store.treeMakerInitialSpecies}
            onClose={() => {
              store.setTreeMakerInitialSpecies(null);
              store.setTreeMakerOpen(false);
            }}
            onOpenVertexPainter={() => {
              store.setTreeMakerOpen(false);
              store.setVertexPaintTarget('forestTree');
            }}
          />
        )}

        {store.objectMakerOpen && (
          <ObjectMakerModal
            store={store}
            initialAssetId={store.objectMakerTargetAssetId}
            onClose={() => store.setObjectMakerOpen(false)}
          />
        )}

        {store.plantMakerOpen && (
          <PlantMakerModal
            store={store}
            initialAssetId={store.plantMakerTargetAssetId}
            onClose={() => store.setPlantMakerOpen(false)}
          />
        )}

        {store.characterMakerOpen && (
          <CharacterMakerModal
            store={store}
            initialAssetId={store.characterMakerTargetAssetId}
            onClose={() => store.setCharacterMakerOpen(false)}
          />
        )}

        {showingExportZip && (
          <ExportProjectZipModal store={store} onClose={() => setShowingExportZip(false)} />
        )}

        {store.isPlaying && <PersistentMinimapHUD store={store} />}
      </Profiler>

      {store.isPlaying && (
        <Profiler id="EditorShell.PlayMode" onRender={onEditorProfilerRender}>
          <PlayModeView store={store} />
        </Profiler>
      )}
    </div>
  );
};
