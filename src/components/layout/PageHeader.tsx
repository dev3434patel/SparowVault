import { cn } from "@/lib/utils";
import { useMessages } from "@/i18n/useMessages";
import type { Messages } from "@/i18n/messages/en";

export type PersonalScreen = keyof Messages["screens"];

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function PersonalPageHeader({
  screen,
  title,
  description,
  actions,
}: {
  screen: PersonalScreen;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  const copy = useMessages().screens[screen];
  return <PageHeader title={title ?? copy.title} description={description ?? copy.description} actions={actions} />;
}
