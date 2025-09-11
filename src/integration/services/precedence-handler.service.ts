import { Injectable, Logger } from '@nestjs/common';
import { ConfigurationSource } from '../interfaces/configuration-source.interface';
import { PrecedenceRule } from '../interfaces/integration-options.interface';

/**
 * Service responsible for handling configuration precedence rules and merging strategies.
 */
@Injectable()
export class PrecedenceHandlerService {
  private readonly logger = new Logger(PrecedenceHandlerService.name);

  /**
   * Apply precedence rules to merge configuration from multiple sources.
   * @param sources - Array of configuration sources
   * @param precedenceRule - The precedence rule to apply
   * @returns Merged configuration data
   */
  applyPrecedenceRules(
    sources: ConfigurationSource[],
    precedenceRule: PrecedenceRule
  ): Record<string, any> {
    this.logger.debug(`Applying precedence rule: ${precedenceRule} to ${sources.length} sources`);

    if (sources.length === 0) {
      return {};
    }

    if (sources.length === 1) {
      return sources[0]?.data || {};
    }

    switch (precedenceRule) {
      case 'aws-first':
        return this.applyAwsFirstPrecedence(sources);
      case 'local-first':
        return this.applyLocalFirstPrecedence(sources);
      case 'merge':
        return this.applyMergePrecedence(sources);
      default:
        this.logger.warn(`Unknown precedence rule: ${precedenceRule}, defaulting to 'aws-first'`);
        return this.applyAwsFirstPrecedence(sources);
    }
  }

  /**
   * Apply AWS-first precedence: AWS sources override local sources.
   * Priority order: AWS Secrets Manager > SSM Parameter Store > Environment > Local Files
   * @param sources - Configuration sources
   * @returns Merged configuration
   */
  private applyAwsFirstPrecedence(sources: ConfigurationSource[]): Record<string, any> {
    this.logger.debug('Applying AWS-first precedence');
    
    const sortedSources = this.sortSourcesByAwsFirstPriority(sources);
    return this.mergeSourcesInOrder(sortedSources);
  }

  /**
   * Apply local-first precedence: Local sources override AWS sources.
   * Priority order: Local Files > Environment > SSM Parameter Store > AWS Secrets Manager
   * @param sources - Configuration sources
   * @returns Merged configuration
   */
  private applyLocalFirstPrecedence(sources: ConfigurationSource[]): Record<string, any> {
    this.logger.debug('Applying local-first precedence');
    
    const sortedSources = this.sortSourcesByLocalFirstPriority(sources);
    return this.mergeSourcesInOrder(sortedSources);
  }

  /**
   * Apply merge precedence: Intelligent merging based on source type and priority.
   * Uses a balanced approach where both AWS and local sources contribute.
   * @param sources - Configuration sources
   * @returns Merged configuration
   */
  private applyMergePrecedence(sources: ConfigurationSource[]): Record<string, any> {
    this.logger.debug('Applying merge precedence');
    
    // Group sources by type
    const sourceGroups = this.groupSourcesByType(sources);
    
    // Merge within each group first
    const mergedGroups: Record<string, any> = {};
    
    for (const [type, typeSources] of Object.entries(sourceGroups)) {
      if (typeSources.length > 0) {
        mergedGroups[type] = this.mergeSourcesInOrder(typeSources);
      }
    }

    // Then merge across groups with balanced priority
    return this.mergeGroupsWithBalancedPriority(mergedGroups);
  }

  /**
   * Sort sources by AWS-first priority.
   * @param sources - Configuration sources
   * @returns Sorted sources (lowest priority first, highest priority last)
   */
  private sortSourcesByAwsFirstPriority(sources: ConfigurationSource[]): ConfigurationSource[] {
    const priorityMap: Record<string, number> = {
      'local-file': 1,
      'environment': 2,
      'ssm': 3,
      'secrets-manager': 4
    };

    return [...sources].sort((a, b) => {
      const priorityA = priorityMap[a.type] || 0;
      const priorityB = priorityMap[b.type] || 0;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // If same type, sort by explicit priority
      return a.priority - b.priority;
    });
  }

  /**
   * Sort sources by local-first priority.
   * @param sources - Configuration sources
   * @returns Sorted sources (lowest priority first, highest priority last)
   */
  private sortSourcesByLocalFirstPriority(sources: ConfigurationSource[]): ConfigurationSource[] {
    const priorityMap: Record<string, number> = {
      'secrets-manager': 1,
      'ssm': 2,
      'environment': 3,
      'local-file': 4
    };

    return [...sources].sort((a, b) => {
      const priorityA = priorityMap[a.type] || 0;
      const priorityB = priorityMap[b.type] || 0;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // If same type, sort by explicit priority
      return a.priority - b.priority;
    });
  }

  /**
   * Group sources by their type.
   * @param sources - Configuration sources
   * @returns Sources grouped by type
   */
  private groupSourcesByType(sources: ConfigurationSource[]): Record<string, ConfigurationSource[]> {
    const groups: Record<string, ConfigurationSource[]> = {};
    
    for (const source of sources) {
      if (!groups[source.type]) {
        groups[source.type] = [];
      }
      groups[source.type]?.push(source);
    }

    // Sort within each group by priority
    for (const type in groups) {
      groups[type]?.sort((a, b) => a.priority - b.priority);
    }

    return groups;
  }

  /**
   * Merge sources in the given order (later sources override earlier ones).
   * @param sources - Ordered configuration sources
   * @returns Merged configuration
   */
  private mergeSourcesInOrder(sources: ConfigurationSource[]): Record<string, any> {
    let merged: Record<string, any> = {};

    for (const source of sources) {
      this.logger.debug(`Merging source: ${source.name} (${source.type})`);
      merged = this.deepMerge(merged, source.data);
    }

    return merged;
  }

  /**
   * Merge groups with balanced priority for merge precedence.
   * @param groups - Configuration groups by type
   * @returns Merged configuration
   */
  private mergeGroupsWithBalancedPriority(groups: Record<string, any>): Record<string, any> {
    let merged: Record<string, any> = {};

    // Merge in balanced order: local-file -> environment -> ssm -> secrets-manager
    const mergeOrder = ['local-file', 'environment', 'ssm', 'secrets-manager'];
    
    for (const type of mergeOrder) {
      if (groups[type]) {
        this.logger.debug(`Merging group: ${type}`);
        merged = this.deepMerge(merged, groups[type]);
      }
    }

    return merged;
  }

  /**
   * Deep merge two configuration objects with conflict resolution.
   * @param target - Target object (lower priority)
   * @param source - Source object (higher priority)
   * @returns Merged object
   */
  private deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (this.shouldDeepMerge(result[key], value)) {
        result[key] = this.deepMerge(result[key], value);
      } else {
        result[key] = this.cloneValue(value);
      }
    }

    return result;
  }

  /**
   * Determine if two values should be deep merged.
   * @param target - Target value
   * @param source - Source value
   * @returns True if should deep merge, false otherwise
   */
  private shouldDeepMerge(target: any, source: any): boolean {
    return target !== null &&
           source !== null &&
           typeof target === 'object' &&
           typeof source === 'object' &&
           !Array.isArray(target) &&
           !Array.isArray(source);
  }

  /**
   * Clone a value to avoid reference issues.
   * @param value - Value to clone
   * @returns Cloned value
   */
  private cloneValue(value: any): any {
    if (value === null || typeof value !== 'object') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map(item => this.cloneValue(item));
    }

    const cloned: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      cloned[key] = this.cloneValue(val);
    }

    return cloned;
  }

  /**
   * Validate configuration sources for precedence handling.
   * @param sources - Configuration sources to validate
   * @returns Validation result with any issues found
   */
  validateSources(sources: ConfigurationSource[]): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!Array.isArray(sources)) {
      issues.push('Sources must be an array');
      return { valid: false, issues };
    }

    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      
      if (!source) {
        issues.push(`Source at index ${i} is null or undefined`);
        continue;
      }
      
      if (!source.name || typeof source.name !== 'string') {
        issues.push(`Source at index ${i} must have a valid name`);
      }

      if (!source.type || !['environment', 'secrets-manager', 'ssm', 'local-file'].includes(source.type)) {
        issues.push(`Source at index ${i} must have a valid type`);
      }

      if (typeof source.priority !== 'number') {
        issues.push(`Source at index ${i} must have a numeric priority`);
      }

      if (!source.data || typeof source.data !== 'object') {
        issues.push(`Source at index ${i} must have valid data object`);
      }

      if (!source.loadedAt || !(source.loadedAt instanceof Date)) {
        issues.push(`Source at index ${i} must have a valid loadedAt date`);
      }
    }

    return { valid: issues.length === 0, issues };
  }

  /**
   * Get the effective priority for a source based on precedence rule.
   * @param source - Configuration source
   * @param precedenceRule - Precedence rule
   * @returns Effective priority
   */
  getEffectivePriority(source: ConfigurationSource, precedenceRule: PrecedenceRule): number {
    const basePriority = source.priority;
    
    switch (precedenceRule) {
      case 'aws-first':
        const awsFirstBonus = source.type === 'secrets-manager' ? 1000 :
                             source.type === 'ssm' ? 500 : 0;
        return basePriority + awsFirstBonus;
        
      case 'local-first':
        const localFirstBonus = source.type === 'local-file' ? 1000 :
                               source.type === 'environment' ? 500 : 0;
        return basePriority + localFirstBonus;
        
      case 'merge':
        // In merge mode, all sources have equal weight
        return basePriority;
        
      default:
        return basePriority;
    }
  }
}