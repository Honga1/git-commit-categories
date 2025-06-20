#!/usr/bin/env node

/**
 * Clean entry point for Git Commit Analyzer
 * This file orchestrates the modular components instead of containing everything inline
 */

import { ConfigService } from './services/ConfigService';
import { CacheService } from './services/CacheService';
import { GitService } from './services/GitService';
import { RealGitInterface } from './git/RealGitInterface';
import type { Config } from './types/config';
import type { CliArguments } from './types/cli';
import { parseCommandLineArgs, printUsage } from './utils/cli';

/**
 * Main application entry point
 * Orchestrates the clean, modular components
 */
async function main(): Promise<void> {
  const cliArgs: CliArguments = parseCommandLineArgs();

  if (cliArgs.help === true) {
    printUsage();
    return;
  }

  try {
    // Initialize git interface
    const gitInterface = new RealGitInterface();

    // Initialize services with proper singleton pattern
    const configService = ConfigService.getInstance();
    const cacheService = new CacheService(gitInterface);
    // const gitService = new GitService(gitInterface); // TODO: Implement full analysis workflow

    // Load configuration
    const config: Config = await configService.loadConfig();

    // Handle different CLI commands
    if (cliArgs.login === true) {
      console.log('🔐 Login functionality not implemented yet');
      console.log('Please set OPENROUTER_API_KEY environment variable directly');
      return;
    }

    if (cliArgs.logout === true) {
      console.log('🔐 Logout functionality not implemented yet');
      return;
    }

    if (cliArgs.status === true) {
      console.log('📊 Configuration Status:');
      console.log('API Key:', config.apiKey.length > 0 ? '✅ Set' : '❌ Missing');
      console.log('Base URL:', config.baseUrl);
      console.log('Classification Model:', config.classificationModel);
      return;
    }

    // Cache management commands
    if (cliArgs.listCaches === true) {
      await cacheService.listCaches();
      return;
    }

    if (cliArgs.clearCache === true) {
      await cacheService.clearCache();
      return;
    }

    if (cliArgs.cacheInfo !== undefined) {
      const info = await cacheService.getCacheInfo(cliArgs.cacheInfo);
      if (info !== null) {
        console.log('📄 Cache Information:');
        Object.entries(info).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
      } else {
        console.log('❌ Cache file not found or invalid');
      }
      return;
    }

    // Main analysis workflow
    if (cliArgs.repoPath.trim().length > 0) {
      console.log(`🔍 Analyzing git repository at: ${cliArgs.repoPath}`);

      // Initialize GitService
      const gitService = new GitService(gitInterface);

      // Validate repository
      console.log('🔍 Validating repository...');
      const validation = await gitService.validateRepository(cliArgs.repoPath);

      if (!validation.isValid) {
        console.error('❌ Repository validation failed:');
        validation.errors.forEach((error) => console.error(`  • ${error}`));
        process.exit(1);
      }

      if (validation.warnings.length > 0) {
        console.warn('⚠️  Repository warnings:');
        validation.warnings.forEach((warning) => console.warn(`  • ${warning}`));
      }

      // Get repository insights
      const insights = await gitService.getRepositoryInsights(cliArgs.repoPath);
      console.log(`📊 Repository insights:`);
      console.log(`  • Total commits: ${insights.totalCommits}`);
      console.log(`  • Current branch: ${insights.currentBranch}`);
      console.log(
        `  • Repository status: ${insights.isClean === true ? 'Clean' : 'Has uncommitted changes'}`
      );

      // Get commits for analysis
      const maxCommits = config.maxCommitsToAnalyze ?? 100;
      console.log(`\n📋 Fetching last ${maxCommits} commits for analysis...`);

      const enrichedCommits = await gitService.getCommitsWithEnhancedDiffs(cliArgs.repoPath, {
        count: maxCommits,
        concurrency: config.diffConcurrency,
        enhanceDiffs: true,
      });

      console.log(`✅ Analysis complete! Processed ${enrichedCommits.length} commits`);
      console.log('\n📊 Summary:');

      // Basic analysis of commit message patterns
      const conventionalCommits = enrichedCommits.filter((commit) =>
        /^(feat|fix|docs|style|refactor|test|chore|build|ci|perf|revert)(\(.+\))?:/i.test(
          commit.message
        )
      );

      const nonConventionalCommits = enrichedCommits.filter(
        (commit) =>
          !/^(feat|fix|docs|style|refactor|test|chore|build|ci|perf|revert)(\(.+\))?:/i.test(
            commit.message
          )
      );

      console.log(
        `  • Conventional commits: ${conventionalCommits.length}/${enrichedCommits.length} (${Math.round((conventionalCommits.length / enrichedCommits.length) * 100)}%)`
      );
      console.log(
        `  • Non-conventional commits: ${nonConventionalCommits.length}/${enrichedCommits.length} (${Math.round((nonConventionalCommits.length / enrichedCommits.length) * 100)}%)`
      );

      if (nonConventionalCommits.length > 0) {
        console.log('\n📝 Sample non-conventional commits:');
        nonConventionalCommits.slice(0, 5).forEach((commit) => {
          console.log(
            `  • ${commit.hash.substring(0, 8)}: ${commit.message.substring(0, 60)}${commit.message.length > 60 ? '...' : ''}`
          );
        });
      }

      // Show file type distribution
      if (Object.keys(insights.commonFileTypes).length > 0) {
        console.log('\n📁 Common file types in recent commits:');
        Object.entries(insights.commonFileTypes)
          .sort(([, a], [, b]) => Number(b) - Number(a))
          .slice(0, 5)
          .forEach(([type, count]) => {
            console.log(`  • ${type}: ${count} files`);
          });
      }

      console.log('\n💡 Recommendations:');
      if (nonConventionalCommits.length > conventionalCommits.length) {
        console.log('  • Consider implementing conventional commit standards');
        console.log('  • Add commit message linting to your workflow');
      } else {
        console.log('  • Great job! Most commits follow conventional standards');
      }

      console.log('\n✅ Analysis complete! This was a safe, read-only operation.');
      console.log(
        '💡 For AI-powered analysis and rewriting, additional features can be implemented.'
      );
    } else {
      console.error('Please provide the path to the git repository as an argument.');
      console.error('Use --help for usage information.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Execute main function
if (require.main === module) {
  main().catch((error: Error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}
