# 🏷️ Releasing

[← Back to README](../README.md)

Versions follow [Semantic Versioning](https://semver.org): every release is a plain `vMAJOR.MINOR.PATCH` that bumps exactly one of the three numbers. There are no pre-releases or release candidates. Versions are tracked with [changie](https://changie.dev). Each change gets a small YAML file in [`.changes/unreleased`](../.changes/unreleased). A release collects those files into the notes for one version, then rebuilds [CHANGELOG.md](../CHANGELOG.md).

> [!IMPORTANT]
> Don't edit `CHANGELOG.md` by hand; changie regenerates it. Edit the files in `.changes/` and run `npx changie merge`.

## 1. Record changes as you go

```bash
make change
```

Pick a kind and write one line, written for the people who use ChoreTrack.

| Kind | Use for | Bumps |
| --- | --- | :---: |
| ✨ Added | New features | minor |
| 🎨 Changed | Changes to existing behaviour | minor |
| 🐛 Fixed | Bug fixes | patch |
| 🔒 Security | Security fixes and hardening | patch |
| ⏳ Deprecated | Things that will be removed later | minor |
| 🧹 Removed | Features taken out | major |
| 💥 Breaking | Anything that needs action when upgrading | major |

## 2. Cut the release

```bash
make changelog-preview          # optional: see the notes and the version first
make release                    # VERSION=auto by default
```

`VERSION=auto` picks the bump from the kinds in the table above: the biggest one wins, so a single 💥 Breaking or 🧹 Removed entry makes it a major release. You can name the bump yourself (`VERSION=major`, `minor` or `patch`), or give an exact `VERSION=vX.Y.Z`. `make release` only accepts a plain `vX.Y.Z` that is higher than the last release.

This batches the unreleased changes into `.changes/vX.Y.Z.md`, rebuilds `CHANGELOG.md`, sets the version in `package.json`, and commits. Open a pull request with that commit.

## 3. Tag it

Once the release commit is merged:

```bash
git switch main && git pull
make tag
```

Pushing the tag runs [the release workflow](../.github/workflows/release.yml). It tests the code and publishes a GitHub release using that version's notes. `make tag` confirms the tag reached GitHub. If a tag exists on your machine but was never pushed, running it again pushes it.

> [!NOTE]
> Home servers following releases pick the new version up with `make update` or `make docker-update`.
