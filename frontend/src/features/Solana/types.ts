/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/skyline_program.json`.
 */
export type SkylineProgram = {
  address: "9r3WeS5AWMXnnt1vepkq8RkaTsR5RYtv7cgBRZ3fs6q3";
  metadata: {
    name: "skylineProgram";
    version: "0.1.0";
    spec: "0.1.0";
    description: "Created with Anchor";
  };
  instructions: [
    {
      name: "bridgeRequest";
      discriminator: [174, 128, 16, 189, 59, 127, 134, 232];
      accounts: [
        {
          name: "signer";
          writable: true;
          signer: true;
        },
        {
          name: "signersAta";
          writable: true;
        },
        {
          name: "bridgingRequest";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  98,
                  114,
                  105,
                  100,
                  103,
                  105,
                  110,
                  103,
                  95,
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116
                ];
              },
              {
                kind: "account";
                path: "signer";
              }
            ];
          };
        },
        {
          name: "mint";
          writable: true;
        },
        {
          name: "tokenProgram";
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "amount";
          type: "u64";
        },
        {
          name: "receiver";
          type: {
            array: ["u8", 57];
          };
        },
        {
          name: "destinationChain";
          type: "u8";
        }
      ];
    },
    {
      name: "bridgeTokens";
      discriminator: [70, 65, 99, 110, 122, 192, 214, 147];
      accounts: [
        {
          name: "mint";
          writable: true;
        },
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "validatorSet";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  118,
                  97,
                  108,
                  105,
                  100,
                  97,
                  116,
                  111,
                  114,
                  45,
                  115,
                  101,
                  116
                ];
              }
            ];
          };
        },
        {
          name: "recipient";
        },
        {
          name: "recipientAta";
          writable: true;
        },
        {
          name: "tokenProgram";
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
        {
          name: "associatedTokenProgram";
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
        }
      ];
      args: [
        {
          name: "amount";
          type: "u64";
        }
      ];
    },
    {
      name: "closeRequest";
      discriminator: [170, 46, 165, 120, 223, 102, 115, 2];
      accounts: [
        {
          name: "signer";
          writable: true;
          signer: true;
        },
        {
          name: "bridgingRequest";
          writable: true;
        },
        {
          name: "validatorSet";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  118,
                  97,
                  108,
                  105,
                  100,
                  97,
                  116,
                  111,
                  114,
                  45,
                  115,
                  101,
                  116
                ];
              }
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [];
    },
    {
      name: "initialize";
      discriminator: [175, 175, 109, 31, 13, 152, 155, 237];
      accounts: [
        {
          name: "signer";
          writable: true;
          signer: true;
        },
        {
          name: "validatorSet";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  118,
                  97,
                  108,
                  105,
                  100,
                  97,
                  116,
                  111,
                  114,
                  45,
                  115,
                  101,
                  116
                ];
              }
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "validators";
          type: {
            vec: "pubkey";
          };
        }
      ];
    },
    {
      name: "validatorSetChange";
      discriminator: [48, 238, 45, 206, 203, 126, 180, 239];
      accounts: [
        {
          name: "validatorSet";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  118,
                  97,
                  108,
                  105,
                  100,
                  97,
                  116,
                  111,
                  114,
                  45,
                  115,
                  101,
                  116
                ];
              }
            ];
          };
        }
      ];
      args: [
        {
          name: "newValidatorSet";
          type: {
            vec: "pubkey";
          };
        }
      ];
    }
  ];
  accounts: [
    {
      name: "bridgingRequest";
      discriminator: [15, 162, 57, 90, 131, 236, 93, 38];
    },
    {
      name: "validatorSet";
      discriminator: [35, 206, 97, 202, 43, 11, 11, 127];
    }
  ];
  errors: [
    {
      code: 6000;
      name: "maxValidatorsExceeded";
      msg: "Maximum number of validators exceeded";
    },
    {
      code: 6001;
      name: "minValidatorsNotMet";
      msg: "Minimum number of validators not met";
    },
    {
      code: 6002;
      name: "validatorsNotUnique";
      msg: "Validators need to be unique";
    },
    {
      code: 6003;
      name: "notEnoughSigners";
      msg: "Not enough signers provided";
    },
    {
      code: 6004;
      name: "invalidSigner";
      msg: "Invalid signer provided";
    },
    {
      code: 6005;
      name: "insufficientFunds";
      msg: "Insufficient funds in the account";
    }
  ];
  types: [
    {
      name: "bridgingRequest";
      type: {
        kind: "struct";
        fields: [
          {
            name: "sender";
            type: "pubkey";
          },
          {
            name: "amount";
            type: "u64";
          },
          {
            name: "receiver";
            type: {
              array: ["u8", 57];
            };
          },
          {
            name: "destinationChain";
            type: "u8";
          },
          {
            name: "mintToken";
            type: "pubkey";
          }
        ];
      };
    },
    {
      name: "validatorSet";
      type: {
        kind: "struct";
        fields: [
          {
            name: "signers";
            type: {
              vec: "pubkey";
            };
          },
          {
            name: "threshold";
            type: "u8";
          },
          {
            name: "bump";
            type: "u8";
          }
        ];
      };
    }
  ];
};
