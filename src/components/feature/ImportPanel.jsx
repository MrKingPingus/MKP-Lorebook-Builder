// Import half of the Import / Export side panel.
//
// The flow itself — parse, disposition, preview, confirm — is shared with the
// title dropdown and the hotbar's Import overlay via useImportFlow, so this file
// is only the panel's framing plus the one thing that is specific to a side
// panel: whether it closes itself once the import lands.
import { useEntries }   from '../../hooks/use-entries.js';
import { useLorebook }  from '../../hooks/use-lorebook.js';
import { useImportFlow } from '../../hooks/use-import-flow.js';
import { useUi }        from '../../hooks/use-ui.js';
import { useMobile }    from '../../hooks/use-mobile.js';
import { useSettings }  from '../../hooks/use-settings.js';
import { ImportFlow }   from './ImportFlow.jsx';
import { IMPORT_STAGE } from '../../constants/import-flow.js';

export function ImportPanel() {
  const { entries }              = useEntries();
  const { activeLorebook }       = useLorebook();
  const setActiveMenuPanel       = useUi((s) => s.setActiveMenuPanel);
  const isMobile                 = useMobile();
  const { keepMenuOpenAfterImport } = useSettings();

  // Mobile always closes the full-screen menu; desktop honours the preference.
  // Cancelling runs through the same path, which is right — a cancelled import
  // in a full-screen menu should still hand the screen back.
  const flow = useImportFlow({
    onDone: () => {
      if (isMobile || !keepMenuOpenAfterImport) setActiveMenuPanel(null);
    },
  });

  return (
    <div className="import-panel">
      {flow.stage === IMPORT_STAGE.source && (
        <>
          <p className="import-label">IMPORT</p>
          <div className="import-panel-info">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} in
            &nbsp;&ldquo;{activeLorebook?.name || '(unnamed)'}&rdquo;
          </div>
        </>
      )}
      <ImportFlow flow={flow} />
      {flow.stage === IMPORT_STAGE.source && (
        <div className="import-hint">
          <em>Attention</em>: JSON files must match our template format exactly
          (TXT and DOCX formats are more flexible) &ndash; Grab the JSON template below!
        </div>
      )}
    </div>
  );
}
