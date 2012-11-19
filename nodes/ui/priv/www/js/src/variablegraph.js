define([
    'lib/parser',
    'src/graph',
    'src/geomnode',
    ], function(Parser, graphLib, geomNode) {

    var VariableGraph = function(graph) {

        var graph = graph || new graphLib.Graph();
        var that = this;
        var parser = new Parser();

        var parseExpressionWithVariables = function(expression, variables) {
            try {
                if (typeof(expression) === 'number') {
                    return expression;
                } else {
                    return parser.parse(expression).evaluate(variables);
                }
            } catch(e) {
                var re = new RegExp('undefined variable: (.*)+');
                var result = re.exec(e.message);
                if (result) {
                    throw new UnknownVariableError(result[1]);
                } else {
                    throw new ParseError();
                }
            }
        }

        this.evaluate = function(expression) {
            var variables = gatherVariables();  
            return parseExpressionWithVariables(expression, variables);
        }

        this.getExpressionChildren = function(expression) {
            if (typeof(expression) === 'number') {
                return [];
            } 
            var childVarNames = parser.parse(expression).variables();
            return childVarNames.map(function(name) {
                return graph.vertexByName(name);
            });
        }

        this.canAdd = function(vertex) {
            var name = vertex.name;
            var expression = vertex.parameters.expression;
            try {
                var variables = gatherVariables();
                parseExpressionWithVariables(expression, variables);
                var parsedWithoutErrors = true;
                // var nameIsTaken = graph.nameIsTaken(name);
                var nameConforms = /^[a-zA-Z][a-zA-Z0-9_]*$/.exec(name) !== null;
                return parsedWithoutErrors && nameConforms;
            } catch (e) {
                if (e instanceof UnknownVariableError) {
                    return false;
                } else if (e instanceof ParseError) {
                    return false;
                }
                throw e;
            }
        }

        this.add = function(vertex) {
            if (this.canAdd(vertex)) {
                graph.addVertex(vertex);
                return true;
            } else {
                return false;
            }
        }

        var gatherVariables = function() {
            var vars = {};
            var listener = function(vertex) {
                if (vertex.type === 'variable') {
                    var variable = vertex.name;
                    var expression = vertex.parameters.expression;
                    var value = parseExpressionWithVariables(expression, vars);
                    vars[variable] = value;
                }
            }
            graph.leafFirstSearch(listener);
            return vars;
        }

    }

    var createVertex = function(name, expression) {
        return new geomNode.Variable({name: name, parameters: {expression: expression}});
    }

    function UnknownVariableError(variable) {
        Error.apply(this, arguments);
        this.message = variable;
    }

    UnknownVariableError.prototype = new Error();
    UnknownVariableError.prototype.constructor = UnknownVariableError;
    UnknownVariableError.prototype.name = 'UnknownVariableError';

    function ParseError() {
        Error.apply(this, arguments);
    }

    ParseError.prototype = new Error();
    ParseError.prototype.constructor = ParseError;
    ParseError.prototype.name = 'ParseError';

    return {
        UnknownVariableError: UnknownVariableError,
        ParseError: ParseError,
        Graph: VariableGraph,
        createVertex: createVertex,
    }

});