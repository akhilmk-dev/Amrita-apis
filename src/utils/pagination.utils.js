/**
 * Formats pagination metadata and result
 */
export const getPaginatedResponse = ({ count, page, limit, data }) => {
  const totalPages = Math.ceil(count / limit);
  
  return {
    items: data,
    meta: {
      totalItems: count,
      itemCount: data.length,
      itemsPerPage: limit,
      totalPages,
      currentPage: page,
    }
  };
};

/**
 * Extracts pagination parameters from query
 */
export const getPaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit) || 10)); // Default 10, max 100
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
};
