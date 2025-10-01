# Support

Thank you for using the CU-BEMS IoT Transmission Failure Analysis Platform! This document provides guidance on how to get help and support.

## 📚 Documentation

Before seeking support, please check our comprehensive documentation:

- **[README.md](README.md)** - Project overview, features, and quick start
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Development setup and contribution guidelines
- **[docs/](docs/)** - Detailed technical documentation
  - [Epic Documentation](docs/epics/) - Feature specifications
  - [Architecture Guides](docs/architecture/) - System design
  - [Deployment Guides](docs/deployment/) - Production setup
  - [QA Reports](docs/qa/) - Quality assurance documentation

## 🐛 Found a Bug?

If you've found a bug, please:

1. **Search existing issues** to check if it's already reported
2. **Create a bug report** using our [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.yml)
3. **Include all required information**:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details
   - Error logs/screenshots

[Report a Bug →](https://github.com/chrimar3/IoT-Transmission-Failure-Analysis-Platform/issues/new?template=bug_report.yml)

## 💡 Feature Requests

Have an idea for a new feature?

1. **Check the roadmap** in [CHANGELOG.md](CHANGELOG.md) to see if it's planned
2. **Search existing feature requests** to avoid duplicates
3. **Submit a feature request** using our [Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.yml)
4. **Provide context**:
   - Problem statement
   - Proposed solution
   - Use cases
   - Priority level

[Request a Feature →](https://github.com/chrimar3/IoT-Transmission-Failure-Analysis-Platform/issues/new?template=feature_request.yml)

## ❓ Questions

Have a question about how to use the platform?

1. **Check the FAQ** in our [documentation](docs/)
2. **Search existing discussions** and issues
3. **Ask in GitHub Discussions** for community help
4. **Create a question issue** using our [Question Template](.github/ISSUE_TEMPLATE/question.yml)

[Ask a Question →](https://github.com/chrimar3/IoT-Transmission-Failure-Analysis-Platform/issues/new?template=question.yml)

## 🚀 Getting Started Help

### Installation Issues

If you're having trouble installing or setting up the platform:

1. **Check system requirements**:
   - Node.js ≥18.0.0
   - npm ≥8.0.0
   - PostgreSQL ≥14.0
   - Supabase account
   - Stripe account (for subscription features)

2. **Follow setup guide** in [README.md](README.md#-quick-start)

3. **Common setup issues**:
   - Environment variables not configured → Check `.env.example`
   - Database connection errors → Verify Supabase credentials
   - Build errors → Clear `.next` folder and `node_modules`, reinstall
   - Port conflicts → Change port in `package.json` scripts

### Configuration Issues

For configuration problems:

- **Stripe webhook issues**: Verify webhook secret in `.env.local`
- **Authentication issues**: Check NextAuth configuration
- **Database issues**: Verify Supabase connection string
- **API rate limiting**: Check subscription tier configuration

## 🔐 Security Issues

**DO NOT** create public issues for security vulnerabilities.

Please report security issues responsibly:

1. **Email**: cmarag8@gmail.com (maintainer)
2. **Subject**: `[SECURITY] Brief description`
3. **Include**:
   - Vulnerability description
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

See [SECURITY.md](SECURITY.md) for our security policy.

## 💬 Community

Join our community for discussions and help:

- **GitHub Discussions**: [Start a discussion](https://github.com/chrimar3/IoT-Transmission-Failure-Analysis-Platform/discussions)
- **Issues**: [Browse open issues](https://github.com/chrimar3/IoT-Transmission-Failure-Analysis-Platform/issues)
- **Pull Requests**: [View PRs](https://github.com/chrimar3/IoT-Transmission-Failure-Analysis-Platform/pulls)

## 📧 Contact

### Maintainer

- **Name**: Chris Maragkoudakis
- **GitHub**: [@chrimar3](https://github.com/chrimar3)
- **Email**: cmarag8@gmail.com

### Response Times

We aim to respond to:
- **Security issues**: Within 24 hours
- **Bug reports**: Within 3-5 business days
- **Feature requests**: Within 1 week
- **Questions**: Within 1 week

Please note these are estimates. Response times may vary based on issue complexity and maintainer availability.

## 🤝 Contributing

Want to contribute? That's awesome!

1. Read our [Contributing Guidelines](CONTRIBUTING.md)
2. Check [open issues](https://github.com/chrimar3/IoT-Transmission-Failure-Analysis-Platform/issues) for tasks
3. Look for issues labeled `good first issue` or `help wanted`
4. Fork the repository and create a pull request

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

Thank you for using and supporting the CU-BEMS IoT Platform! Your feedback and contributions help make this project better for everyone.

---

**Still need help?** Create an issue and we'll do our best to assist you!
