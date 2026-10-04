export function ReportSharing({checked,onChange,disabled=false}:{checked:boolean;onChange:(value:boolean)=>void;disabled?:boolean}) {
  return <label className="issue-report-escape"><input type="checkbox" checked={checked} disabled={disabled} onChange={event=>onChange(event.target.checked)}/><span>Share the private report details, configuration, replies and any attached log with GitHub-verified maintainers of this module. You can stop sharing from Your account. These details stay private.</span></label>
}
