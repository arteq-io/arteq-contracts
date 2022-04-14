.PHONY: build
build:
	npx hardhat compile

.PHONY: test
test:
	npx hardhat test
