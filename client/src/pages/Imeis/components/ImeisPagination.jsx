const ImeisPagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="imeis-pagination">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="btn btn--secondary btn--small"
      >
        Zurück
      </button>
      <span className="imeis-pagination-info">
        Seite <strong>{currentPage}</strong> von <strong>{totalPages}</strong>
      </span>
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="btn btn--secondary btn--small"
      >
        Weiter
      </button>
    </div>
  );
};

export default ImeisPagination;
