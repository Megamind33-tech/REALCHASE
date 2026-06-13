# CHASE Studio Pro — UI Component Map

Inventory of shell components, props, state ownership, and future integration points.

## Shell Root

| Component | Path | Responsibility |
|-----------|------|----------------|
| `AppShell` | `src/components/shell/AppShell.tsx` | Grid layout, panel collapse, quality/compact modes |
| `ShellProvider` | `src/context/ShellContext.tsx` | Global UI state (no engine coupling) |

---

## Top Region

| Component | Props / State | Notes |
|-----------|---------------|-------|
| `TopBar` | `projectName`, `systemHealth`, `metrics`, `onRecToggle`, `onGoLive` | File ops dispatch to future project service |
| `BrandMark` | — | Static wordmark |
| `ProjectSelector` | `projects`, `current`, `onChange` | Dropdown; shell uses mock list |
| `FileActions` | `onSave`, `onOpen`, `onNew`, `onImport` | Toast confirmation in shell |
| `HistoryActions` | `canUndo`, `canRedo`, `onUndo`, `onRedo` | Disabled when stack empty |
| `SystemMetrics` | `cpu`, `gpu`, `ram`, `resolution`, `fps` | Mock telemetry; later Tauri sysinfo |
| `RecButton` | `isRecording`, `onToggle` | Red dot pulse unless reduced motion |
| `GoLiveButton` | `isLive`, `onToggle` | Solid red when live |

---

## Left Region

| Component | Props / State | Notes |
|-----------|---------------|-------|
| `ModuleRail` | `activeModule`, `onModuleChange` | 11 modules |
| `ModuleButton` | `icon`, `label`, `active`, `onClick` | |
| `AssetPanel` | `collapsed`, `activeTab`, `onTabChange` | Builder module only |
| `AssetPanelTabs` | `tabs`, `active`, `onChange` | SETS / ELEMENTS / ASSETS |
| `AssetSearch` | `value`, `onChange`, `onFilter` | |
| `CategoryFilters` | `categories`, `active`, `onChange` | Chip row |
| `StudioPackGrid` | `packs`, `onSelect` | Thumbnail grid |
| `ObjectGrid` | `objects`, `onAdd` | 3D object shortcuts |
| `LightingPresets` | `presets`, `onApply` | Circular buttons |
| `DropZone` | `onDrop` | HTML5 drag events; no engine yet |
| `PanelCollapseHandle` | `side`, `collapsed`, `onToggle` | Reusable |

---

## Center Region

| Component | Props / State | Notes |
|-----------|---------------|-------|
| `Viewport` | `mode3d`, `camera`, `quality`, `selectedObject`, `showSafeArea` | Babylon canvas mounts here later |
| `ViewportToolbar` | tools, toggles | |
| `ViewportCanvas` | — | Placeholder div → `#babylon-canvas` mount point |
| `ViewportOverlay` | `isLive`, `selectionBounds` | LIVE badge, safe guides |
| `TransformGizmoHint` | — | SVG overlay until Babylon gizmo |
| `CameraStrip` | `cameras`, `activeId`, `onSelect`, `onAdd` | |
| `CameraThumb` | `shot`, `label`, `active`, `thumbnail` | |
| `Timeline` | `layers`, `timecode`, `zoom`, `collapsed` | |
| `TimelineRuler` | `duration`, `currentTime`, `zoom` | |
| `TimelineLayerList` | `layers`, `selectedId`, `onSelect` | |
| `TimelineTrack` | `layer`, `keyframes`, `color` | |
| `TimelineTransport` | playback state | UI-only in shell |
| `PerformanceBanner` | `visible`, `onDismiss`, `onSetQuality` | Weak machine warning |

---

## Right Region

| Component | Props / State | Notes |
|-----------|---------------|-------|
| `Inspector` | `selectedObject`, `activeSubTab` | |
| `InspectorTabs` | INSPECTOR / LAYERS | |
| `InspectorSubTabs` | Layout, Camera, Light, etc. | Icon tab bar |
| `LayoutInspector` | desk/layout props | Default for News Desk |
| `CameraInspector` | focal length, DOF, parallax | |
| `LightInspector` | intensity, color, preset | |
| `PresenterInspector` | skin, eye, teeth sliders | |
| `KeyingInspector` | spill, tolerance | Future chroma |
| `MaterialsInspector` | PBR slots | Future Babylon materials |
| `LayersInspector` | scene graph tree | Sync with timeline |
| `OutputPanel` | transitions, mixer, streams | |
| `TransitionGrid` | `active`, `duration`, `onChange` | |
| `AudioMixer` | `channels`, levels | Mock meter animation |
| `StreamDestinations` | `destinations` | YouTube, FB, RTMP rows |
| `ProgramMonitor` | `status` | PGM output health |

---

## Bottom Region

| Component | Props / State | Notes |
|-----------|---------------|-------|
| `StatusBar` | `projectStatus`, `metrics`, `autosave`, `backup`, `messages` | |
| `PerformanceWarning` | integrated in StatusBar | Yellow state |

---

## Shared Primitives (`src/components/ui/`)

| Component | Variants |
|-----------|----------|
| `Button` | ghost, secondary, primary, danger |
| `IconButton` | sizes sm/md |
| `Tabs` | segmented |
| `Slider` | horizontal |
| `Toggle` | on/off |
| `Dropdown` | select |
| `Meter` | vertical audio |
| `Chip` | filter category |
| `Tooltip` | hover labels on rail |

---

## Context State Shape (`ShellContext`)

```typescript
interface ShellState {
  activeModule: ModuleId;
  projectName: string;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  timelineCollapsed: boolean;
  compactMode: boolean;
  reducedMotion: boolean;
  qualityMode: 'low' | 'balanced' | 'high';
  activeCameraId: string;
  selectedLayerId: string;
  selectedObjectId: string;
  inspectorSubTab: InspectorSubTab;
  isRecording: boolean;
  isLive: boolean;
  showSafeArea: boolean;
  viewportMode: '3d' | '2d';
  performanceWarning: boolean;
}
```

---

## Future Integration Hooks

| Hook / Mount Point | Engine / Service |
|--------------------|------------------|
| `#babylon-viewport` | BabylonJS Editor fork canvas |
| `useProjectActions` | Tauri FS + scene serialization |
| `useSystemMetrics` | Tauri sysinfo plugin |
| `useStreamDestinations` | RTMP/SRT service (later) |
| `useUndoStack` | Command pattern from Babylon editor |
| `AssetPanel.onSelect` | Asset loader / pack importer |

---

## Module → Panel Visibility Matrix

| Module | Asset Panel | Center | Inspector | Output |
|--------|-------------|--------|-----------|--------|
| Builder | AssetPanel | Viewport+Timeline | Full | Full |
| Scenes | Scene list (future) | Viewport | Scene props | Full |
| Audio | Hidden | Mixer full (future) | Channel | Full |
| Settings | Hidden | Settings form | Hidden | Hidden |

Shell milestone: only Builder shows full layout; other modules swap center placeholder text.
