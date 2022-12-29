# sccache-action

GitHub action for using [sccache](https://github.com/mozilla/sccache).

## Usage
In your workflow, add the following step:

```yaml

- name: Cache Rust compilation
  uses: metalbear-co/sccache-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}

```

This action uses the GitHub API, so the `github-token` is necessary in order to avoid issues with rate limiting.

By default, this action will set the following environment variables as [required by `sccache`](https://github.com/mozilla/sccache/blob/main/docs/Rust.md):
- `RUSTC_WRAPPER="<path to sccache>"`
- `CARGO_INCREMENTAL=0`

## Implementation examples
[mirrord](https://github.com/metalbear-co/mirrord) - [ci.yaml](https://github.com/metalbear-co/mirrord/blob/main/.github/workflows/ci.yaml)

## Changelog
See [CHANGELOG.md](./CHANGELOG.md)

## Contributing

You're welcome to contribute.

## License

Released under [MIT License](./LICENSE)
