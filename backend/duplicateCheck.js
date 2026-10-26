function normalize(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function checkDuplicate(newFdr, existingFdrs) {
  const matches = existingFdrs.filter((fdr) => {
    const sameNumber =
      normalize(fdr.fdrNumber) === normalize(newFdr.fdrNumber);

    const sameBank =
      normalize(fdr.bankName) === normalize(newFdr.bankName);

    const sameAmount =
      Number(fdr.amount) === Number(newFdr.amount);

    return (
      sameNumber ||
      (sameBank && sameAmount && sameNumber)
    );
  });

  return {
    possibleDuplicate: matches.length > 0,
    message: matches.length
      ? "A record with the same FDR number already exists."
      : "No exact FDR-number match found.",
    matches: matches.map((fdr) => ({
      id: fdr._id,
      fdrNumber: fdr.fdrNumber,
      bankName: fdr.bankName
    }))
  };
}

module.exports = checkDuplicate;