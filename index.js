const functionRegex = /(\w+)\(([^)]*)\)/;

function evaluateStringFunction(inputString, functionMap) {
  const match = inputString.match(functionRegex);
  if (match) {
    const [, fn, strArgs] = match;
    if (functionMap.hasOwnProperty(fn)) {
      const args = strArgs.split(",").map((arg) => arg.trim());
      const result = functionMap[fn](...args);
      return result !== undefined ? result : inputString; // Return result if not undefined
    } else {
      return inputString; // Return original string if function not found in functionMap
    }
  } else {
    return inputString; // Return original string if no function call is found
  }
}
module.exports = function simpleMongoQuery(fnNotation) {
  return function interpreter(queryObject) {
    function convertIfNumber(value) {
      if (typeof value !== "string") {
        return value;
      }
      if (value.startsWith("=true")) return true;
      if (value.startsWith("=false")) return false;

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
    const fieldNames = Object.keys(queryObject);
    function addFieldNamesFromQuery(queryString, obj) {
      for (const name of fieldNames) {
        if (queryString.includes(`${name}:`)) {
          obj[name] = undefined;
        }
      }
      return obj;
    }
    function getQueryFromString(queryString) {
      const [propName, queryStr] = queryString.split(":").map((val) => val.trim());
      return { [propName]: queryStr };
    }
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

    function nextLogicalClause(queryString) {
      const andPosition = queryString.indexOf("&&");
      const orPosition = queryString.indexOf("||");
      if (andPosition === -1 && orPosition === -1) return undefined;
      else return andPosition > orPosition ? "&&" : "||";
    }
    function handleAndOrOperators(queryString, propertyName) {
      queryString = trimFront(queryString);

      if (queryString.startsWith("&&")) {
        const conditions = queryString.slice(2);
        //to avoid unnecessary nesting
        if (nextLogicalClause(conditions) === "&&") {
          queryString = conditions;
        } else {
          const query = addFieldNamesFromQuery(queryString, {
            [propertyName]: conditions,
          });
          andConditions.push(interpreter(query));
          return;
        }
      } else if (queryString.startsWith("||")) {
        const conditions = queryString.slice(2);
        //to avoid unnecessary nesting
        if (nextLogicalClause(conditions) === "||") {
          queryString = conditions;
        } else {
          const query = addFieldNamesFromQuery(queryString, {
            [propertyName]: conditions,
          });
          orConditions.push(interpreter(query));
          return;
        }
      }
      const symbol = nextLogicalClause(queryString);
      const conditions = queryString
        .split(symbol)
        .filter((cond) => cond)
        .map((cond) => cond.trim());
      if (symbol === "&&") {
        andConditions.push(
          ...conditions.map((cond) => {
            if (fieldNames.some((name) => cond.startsWith(`${name}:`))) {
              return interpreter(getQueryFromString(cond));
            } else return interpreter({ [propertyName]: cond });
          })
        );
      } else {
        orConditions.push(
          ...conditions.map((cond) => {
            if (fieldNames.some((name) => cond.startsWith(`${name}:`))) {
              return interpreter(getQueryFromString(cond));
            } else return interpreter({ [propertyName]: cond });
          })
        );
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
          if (queryString.startsWith("!=undefined"))
            query[propertyName] = { $exists: true, $ne: undefined };
          else query[propertyName] = { $ne: convertIfNumber(queryString.slice(1)) };
        } else if (queryString.startsWith("=undefined")) {
          query[propertyName] = query[propertyName] = { $exists: false };
        } else if (queryString.startsWith("[") && queryString.endsWith("]")) {
          const values = queryString
            .slice(1, -1)
            .split(",")
            .map((value) => value.trim());
          query[propertyName] = { $in: values.map(convertIfNumber) };
        } else if (queryString.startsWith("![") && queryString.endsWith("]")) {
          const values = queryString
            .slice(2, -1)
            .split(",")
            .map((value) => value.trim());
          query[propertyName] = { $nin: values.map(convertIfNumber) };
        } else if (fnNotation && functionRegex.test(queryString)) {
          query[propertyName] = evaluateStringFunction(queryString, fnNotation);
        } else if (!query[propertyName]) {
          query[propertyName] = convertIfNumber(queryString);
        }
      } else if (Array.isArray(propertyValue)) {
        query[propertyName] = { $in: propertyValue };
      } else if (propertyValue || propertyValue === false) {
        query[propertyName] = propertyValue;
      }
    }

    if (andConditions.length) {
      if (!query.$and) query.$and = [];
      query.$and.push(...andConditions);
    }
    if (orConditions.length) {
      if (query.$and) {
        if (orConditions.length === 1) {
          query.$and.push(orConditions[0]);
        } else {
          query.$and.push({ $or: orConditions });
        }
      } else {
        if (!query.$or) query.$or = [];
        query.$or.push(...orConditions);
      }
    }

    return query;
  };
};
