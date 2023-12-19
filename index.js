module.exports = function simpleMongoQuery(queryObject) {
  function convertIfNumber(value) {
    if (typeof value !== "string") {
      return value;
    }

    if (value.startsWith("=")) {
      const parsedValue = value.slice(1).trim();
      const numericValue = parseFloat(parsedValue);
      return isNaN(numericValue) ? parsedValue : numericValue;
    }

    return value;
  }
  const trimFront = (str) => str.replace(/^\s+/, "");

  const query = {};
  const andConditions = [];
  const orConditions = [];
  function handleComparisonOperators(queryString, propertyName) {
    const comparisonOperators = queryString.split(":").map((op) => op.trim());

    comparisonOperators.forEach((op) => {
      const operator = op.trim();

      if (operator.startsWith(">=")) {
        const parsedValue = parseFloat(operator.slice(2));
        if (!isNaN(parsedValue)) {
          if (!query[propertyName]) query[propertyName] = {};
          query[propertyName].$gte = parsedValue;
        } else query[propertyName] = operator;
      } else if (operator.startsWith("<=")) {
        const parsedValue = parseFloat(operator.slice(2));
        if (!isNaN(parsedValue)) {
          if (!query[propertyName]) query[propertyName] = {};
          query[propertyName].$lte = parsedValue;
        } else query[propertyName] = operator;
      } else if (operator.startsWith(">")) {
        const parsedValue = parseFloat(operator.slice(1));
        if (!isNaN(parsedValue)) {
          if (!query[propertyName]) query[propertyName] = {};
          query[propertyName].$gt = parsedValue;
        } else query[propertyName] = operator;
      } else if (operator.startsWith("<")) {
        const parsedValue = parseFloat(operator.slice(1));
        if (!isNaN(parsedValue)) {
          if (!query[propertyName]) query[propertyName] = {};
          query[propertyName].$lt = parsedValue;
        } else query[propertyName] = operator;
      }
    });
  }

  function handleAndOrOperators(queryString, propertyName) {
    if (queryString.startsWith("&&")) {
      const conditions = trimFront(queryString.slice(2));
      andConditions.push(createMongoQueryFromObject({ [propertyName]: conditions }));
    } else if (queryString.startsWith("||")) {
      const conditions = trimFront(queryString.slice(2));
      orConditions.push(createMongoQueryFromObject({ [propertyName]: conditions }));
    } else if (queryString.includes("&&")) {
      const conditions = queryString.split("&&").map(trimFront);
      const validConditions = conditions.filter((cond) => cond); // Remove empty conditions
      if (validConditions.length) {
        andConditions.push(
          ...validConditions.map((cond) =>
            createMongoQueryFromObject({ [propertyName]: cond })
          )
        );
      }
    } else if (queryString.includes("||")) {
      const conditions = queryString.split("||").map(trimFront);
      const validConditions = conditions.filter((cond) => cond); // Remove empty conditions
      if (validConditions.length) {
        orConditions.push(
          ...validConditions.map((cond) =>
            createMongoQueryFromObject({ [propertyName]: cond })
          )
        );
      }
    }
  }
  for (propertyName in queryObject) {
    const propertyValue = queryObject[propertyName];

    if (typeof propertyValue === "string") {
      const queryString = propertyValue.trim();
      if (queryString.includes("&&") || queryString.includes("||")) {
        handleAndOrOperators(queryString, propertyName);
      } else if ([">=", "<=", ">", "<"].some((op) => queryString.startsWith(op))) {
        handleComparisonOperators(queryString, propertyName);
      } else if (queryString.startsWith("rx=")) {
        const regexPattern = queryString.slice(3); // Extracting the pattern after 'regex='
        query[propertyName] = { $regex: regexPattern };
      } else if (queryString.startsWith("!=")) {
        query[propertyName] = { $ne: convertIfNumber(queryString.slice(1)) };
      } else if (queryString.startsWith("[") && queryString.endsWith("]")) {
        const values = queryString
          .slice(1, -1)
          .split(",")
          .map((value) => value.trim());
        query[propertyName] = { $in: values.map(convertIfNumber) };
      } else if (queryString.startsWith("![") && queryString.endsWith("]")) {
        const values = queryString
          .slice(1, -1)
          .split(",")
          .map((value) => value.trim());
        query[propertyName] = { $nin: values.map(convertIfNumber) };
      } else if (!query[propertyName]) {
        query[propertyName] = convertIfNumber(queryString);
      }
    } else if (Array.isArray(queryString)) {
      query[propertyName] = { $in: queryString };
    } else {
      query[propertyName] = propertyValue;
    }
  }

  if (andConditions.length) {
    if (!query.$and) query.$and = [];
    query.$and.push(...andConditions);
  }
  if (orConditions.length) {
    if (query.$and) {
      query.$and.push({ $or: orConditions });
    } else {
      if (!query.$or) query.$or = [];
      query.$or.push(...orConditions);
    }
  }

  return query;
};
