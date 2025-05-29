class inkject {
    render(template, data = {}, delimiter = '&&') {
        const [openDelim, closeDelim] = this.parseDelimiter(delimiter);
        let result = template;
        result = this.processConditionals(result, data, openDelim, closeDelim);
        result = this.processVariables(result, data, openDelim, closeDelim);
        return result;
    }

    parseDelimiter(delimiter) {
        const len = delimiter.length;
        if (len % 2 === 0) {
            const mid = len / 2;
            return [delimiter.slice(0, mid), delimiter.slice(mid)];
        } else {
            return [delimiter, delimiter];
        }
    }

    processConditionals(template, data, openDelim, closeDelim) {
        let result = template;
        let changed = true;

        while (changed) {
            changed = false;
            const match = this.findInnermostConditional(result, openDelim, closeDelim);
            if (match) {
                const replacement = this.evaluateConditionalBlock(match.content, data, openDelim, closeDelim);
                const beforeMatch = result.slice(0, match.start);
                const afterMatch = result.slice(match.end);

                const isInline = this.isInlineConditional(beforeMatch, afterMatch, match.content);

                if (isInline) {
                    result = beforeMatch + replacement + afterMatch;
                } else {
                    let cleanedReplacement = replacement.trim();
                    let cleanedBefore = beforeMatch;
                    let cleanedAfter = afterMatch;

                    if (cleanedReplacement === '') {
                        if (cleanedBefore.endsWith('\n')) {
                            cleanedBefore = cleanedBefore.slice(0, -1);
                        }
                        if (cleanedAfter.startsWith('\n')) {
                            cleanedAfter = cleanedAfter.slice(1);
                        }
                        result = cleanedBefore + cleanedAfter;
                    } else {
                        const needsNewlineBefore = cleanedBefore.length > 0 && !cleanedBefore.endsWith('\n') && cleanedReplacement.length > 0;
                        const needsNewlineAfter = cleanedAfter.length > 0 && !cleanedAfter.startsWith('\n') && cleanedReplacement.length > 0;

                        result = cleanedBefore +
                            (needsNewlineBefore ? '\n' : '') +
                            cleanedReplacement +
                            (needsNewlineAfter ? '\n' : '') +
                            cleanedAfter;
                    }
                }
                changed = true;
            }
        }

        return result;
    }

    isInlineConditional(beforeMatch, afterMatch, conditionalContent) {
        const beforeLastNewline = beforeMatch.lastIndexOf('\n');
        const afterFirstNewline = afterMatch.indexOf('\n');

        const beforeText = beforeLastNewline === -1 ? beforeMatch : beforeMatch.slice(beforeLastNewline + 1);
        const afterText = afterFirstNewline === -1 ? afterMatch : afterMatch.slice(0, afterFirstNewline);

        const hasContentBefore = beforeText.trim().length > 0;
        const hasContentAfter = afterText.trim().length > 0;

        const conditionalHasNewlines = conditionalContent.includes('\n');

        return (hasContentBefore || hasContentAfter) && !conditionalHasNewlines;
    }

    findInnermostConditional(template, openDelim, closeDelim) {
        const ifPattern = openDelim + '#if ';
        const endifPattern = openDelim + '/if' + closeDelim;

        let deepestIf = null;
        let maxDepth = 0;

        for (let i = 0; i < template.length; i++) {
            if (template.substr(i, ifPattern.length) === ifPattern) {
                let depth = 0;
                let currentPos = i;
                let foundMatching = false;

                while (currentPos < template.length) {
                    if (template.substr(currentPos, ifPattern.length) === ifPattern) {
                        depth++;
                        currentPos += ifPattern.length;
                    } else if (template.substr(currentPos, endifPattern.length) === endifPattern) {
                        depth--;
                        if (depth === 0) {
                            if (!foundMatching || depth >= maxDepth) {
                                let hasNestedIf = false;
                                const blockContent = template.slice(i + ifPattern.length, currentPos);
                                if (blockContent.indexOf(ifPattern) !== -1) {
                                    hasNestedIf = true;
                                }

                                if (!hasNestedIf) {
                                    deepestIf = {
                                        start: i,
                                        end: currentPos + endifPattern.length,
                                        content: template.slice(i, currentPos + endifPattern.length)
                                    };
                                    maxDepth = depth;
                                }
                            }
                            foundMatching = true;
                            break;
                        }
                        currentPos += endifPattern.length;
                    } else {
                        currentPos++;
                    }
                }
            }
        }

        return deepestIf;
    }

    evaluateConditionalBlock(block, data, openDelim, closeDelim) {
        const sections = this.parseConditionalSections(block, openDelim, closeDelim);

        for (const section of sections) {
            if (section.type === 'else' || this.evaluateCondition(section.condition, data)) {
                return section.content;
            }
        }

        return '';
    }

    parseConditionalSections(block, openDelim, closeDelim) {
        const sections = [];

        const ifRegex = new RegExp(`^${this.escapeRegex(openDelim)}#if\\s+([^${this.escapeRegex(closeDelim)}]+)${this.escapeRegex(closeDelim)}`);
        const elseifRegex = new RegExp(`${this.escapeRegex(openDelim)}#elseif\\s+([^${this.escapeRegex(closeDelim)}]+)${this.escapeRegex(closeDelim)}`, 'g');
        const elseRegex = new RegExp(`${this.escapeRegex(openDelim)}#else${this.escapeRegex(closeDelim)}`);
        const endifRegex = new RegExp(`${this.escapeRegex(openDelim)}/if${this.escapeRegex(closeDelim)}$`);

        const ifMatch = block.match(ifRegex);
        if (!ifMatch) return sections;

        let content = block.replace(ifRegex, '').replace(endifRegex, '');
        let pos = 0;
        let currentCondition = ifMatch[1].trim();
        let currentType = 'if';

        const elseifMatches = [];
        let elseifMatch;
        while ((elseifMatch = elseifRegex.exec(content)) !== null) {
            elseifMatches.push({
                index: elseifMatch.index,
                condition: elseifMatch[1].trim(),
                fullMatch: elseifMatch[0]
            });
        }

        const elseMatch = content.match(elseRegex);
        const elsePos = elseMatch ? content.search(elseRegex) : -1;

        const allBreakpoints = [
            ...elseifMatches.map(m => ({ pos: m.index, type: 'elseif', condition: m.condition, length: m.fullMatch.length })),
            ...(elsePos !== -1 ? [{ pos: elsePos, type: 'else', condition: null, length: elseMatch[0].length }] : [])
        ].sort((a, b) => a.pos - b.pos);

        for (let i = 0; i <= allBreakpoints.length; i++) {
            const start = i === 0 ? 0 : allBreakpoints[i - 1].pos + allBreakpoints[i - 1].length;
            const end = i === allBreakpoints.length ? content.length : allBreakpoints[i].pos;

            const sectionContent = content.slice(start, end);

            sections.push({
                type: currentType,
                condition: currentCondition,
                content: sectionContent
            });

            if (i < allBreakpoints.length) {
                currentType = allBreakpoints[i].type;
                currentCondition = allBreakpoints[i].condition;
            }
        }

        return sections;
    }

    processVariables(template, data, openDelim, closeDelim) {
        const openPattern = this.escapeRegex(openDelim);
        const closePattern = this.escapeRegex(closeDelim);
        const varRegex = new RegExp(`${openPattern}([^#/][^${closePattern.slice(-1)}]*)${closePattern}`, 'g');

        return template.replace(varRegex, (match, variable) => {
            const value = this.getValue(variable.trim(), data);
            return value !== undefined ? String(value) : '';
        }).replace(/\n\s*\n\s*\n/g, '\n\n');
    }

    evaluateCondition(condition, data) {
        if (!condition) return false;

        condition = condition.trim();

        if (condition.startsWith('!')) {
            return !this.evaluateCondition(condition.slice(1), data);
        }

        const operators = ['===', '!==', '==', '!=', '>=', '<=', '>', '<'];
        for (const op of operators) {
            const opIndex = condition.indexOf(op);
            if (opIndex !== -1) {
                const left = condition.slice(0, opIndex).trim();
                const right = condition.slice(opIndex + op.length).trim();
                const leftValue = this.getValue(left, data);
                const rightValue = this.parseValue(right);

                switch (op) {
                    case '===': return leftValue === rightValue;
                    case '!==': return leftValue !== rightValue;
                    case '==': return leftValue == rightValue;
                    case '!=': return leftValue != rightValue;
                    case '>=': return leftValue >= rightValue;
                    case '<=': return leftValue <= rightValue;
                    case '>': return leftValue > rightValue;
                    case '<': return leftValue < rightValue;
                }
            }
        }

        const value = this.getValue(condition, data);
        return Boolean(value);
    }

    getValue(path, data) {
        const keys = path.split('.');
        let current = data;

        for (const key of keys) {
            if (current === null || current === undefined) {
                return undefined;
            }
            current = current[key];
        }

        return current;
    }

    parseValue(value) {
        value = value.trim();

        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            return value.slice(1, -1);
        }

        if (!isNaN(value) && !isNaN(parseFloat(value)) && value !== '') {
            return parseFloat(value);
        }

        if (value === 'true') return true;
        if (value === 'false') return false;
        if (value === 'null') return null;
        if (value === 'undefined') return undefined;

        return value;
    }

    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

module.exports = inkject;