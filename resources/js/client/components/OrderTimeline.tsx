interface Props {
  status: string;
  createdAt: string;
  deliveryConfirmedAt: string | null;
  assignedToName: string | null | undefined;
}

const COMPLETED_STATUSES = new Set(['confirmed', 'out_for_delivery', 'completed']);

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function OrderTimeline({ status, createdAt, deliveryConfirmedAt, assignedToName }: Props) {
  const isConfirmed   = COMPLETED_STATUSES.has(status);
  const isOutForDel   = status === 'out_for_delivery' || status === 'completed';
  const isDelivered   = status === 'completed';
  const isReceipt     = !!deliveryConfirmedAt;
  const isCancelled   = status === 'cancelled';

  const steps: { label: string; sub?: string; done: boolean; date?: string }[] = [
    {
      label: 'Order placed',
      done:  true,
      date:  fmt(createdAt),
    },
    {
      label: 'Confirmed',
      sub:   isCancelled ? undefined : 'Your order is being prepared',
      done:  isConfirmed,
    },
    {
      label: 'Out for delivery',
      sub:   assignedToName ? `Driver: ${assignedToName}` : undefined,
      done:  isOutForDel,
    },
    {
      label: 'Delivered',
      done:  isDelivered,
    },
    {
      label: 'Receipt confirmed',
      done:  isReceipt,
      date:  deliveryConfirmedAt ? fmt(deliveryConfirmedAt) : undefined,
    },
  ];

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
        <span className="text-sm font-semibold text-red-700">Order cancelled</span>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <div key={step.label} className="flex gap-3">
            {/* indicator + connector */}
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold transition-colors ${
                  step.done
                    ? 'bg-green-600 border-green-600 text-white'
                    : 'bg-white border-gray-300 text-gray-300'
                }`}
              >
                {step.done ? '✓' : ''}
              </div>
              {!isLast && (
                <div className={`w-0.5 flex-1 my-1 ${step.done && steps[i + 1]?.done ? 'bg-green-600' : 'bg-gray-200'}`} />
              )}
            </div>

            {/* content */}
            <div className={`pb-4 ${isLast ? '' : 'pb-4'}`}>
              <p className={`text-sm font-semibold leading-7 ${step.done ? 'text-gray-900' : 'text-gray-400'}`}>
                {step.label}
              </p>
              {step.sub && (
                <p className="text-xs text-gray-400 leading-tight">{step.sub}</p>
              )}
              {step.date && (
                <p className="text-xs text-gray-400 mt-0.5">{step.date}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
