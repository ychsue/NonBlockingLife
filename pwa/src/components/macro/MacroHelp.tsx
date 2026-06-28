import { stringify } from 'yaml'
import { ADD_TARGET_TABLES, COMMAND_SPECS } from '../../macro/commandRegistry'

export function MacroHelp() {
  return (
    <details className="rounded-lg border border-gray-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-semibold text-gray-700">Macro Command Help</summary>
      <div className="mt-3 space-y-4 text-sm text-gray-700">
        <div>
          <div className="font-medium text-gray-800">Allowed add targets</div>
          <div>{ADD_TARGET_TABLES.join(', ')}</div>
        </div>

        {COMMAND_SPECS.map((spec) => (
          <div key={spec.type} className="rounded border border-gray-100 bg-gray-50 p-3">
            <div className="font-semibold text-gray-800">{spec.type}</div>
            <div className="mt-1">{spec.summary}</div>
            {spec.requiredFields.length > 0 && (
              <div className="mt-1 text-xs text-gray-600">Required: {spec.requiredFields.join(', ')}</div>
            )}
            <pre className="mt-2 overflow-auto rounded border border-gray-200 bg-white p-2 text-xs">
              {stringify([spec.example])}
            </pre>
          </div>
        ))}
      </div>
    </details>
  )
}
