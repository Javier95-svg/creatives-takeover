import { Button } from "@/components/ui/button";

interface InsightaPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const InsightaPagination = ({
  page,
  totalPages,
  onPageChange,
}: InsightaPaginationProps) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col items-center gap-3 pt-4">
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {Array.from({ length: totalPages }, (_, index) => {
          const pageNumber = index + 1;
          const isActive = pageNumber === page;

          return (
            <Button
              key={pageNumber}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(pageNumber)}
            >
              {pageNumber}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default InsightaPagination;
