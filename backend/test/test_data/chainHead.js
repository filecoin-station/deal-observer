import { CID } from 'multiformats/cid'

const chainHeadTestData = {
    "Blocks": [
        {
            "BLSAggregate": {
                "Data": "j2uqFe0eviamQd/tPFMFLriZ91uhwR+wbxsmjf+zs8UeAbbPUF7iFNsEQDdAvXUpDnqaRJ0Nbnzz5JGU3pOG+03BnyFKlYNiLdYFHE/4yshIGcroMEqDfYrnO56UzsZS",
                "Type": 2
            },
            "BeaconEntries": [
                {
                    "Data": "tbjCwGcatwCMd2AGpWvsM5vVLaQ3bKdX/r+FIvaDfU+GEo4xuPUm7JQg69gLSvht",
                    "Round": 14722392
                }
            ],
            "BlockSig": {
                "Data": "kP+U9/AmcPs53OuESF0FMp5rv+r/rfNaa2C5cRes/X05lUUIIaNdXUwyYxIu6Oc6EakhuU59JLCHbbW+kFUtq8V6KgY9sEvK9Vu17Lu7uanYwZ9u5ZeIqvCF/rojELci",
                "Type": 2
            },
            "ElectionProof": {
                "VRFProof": "lG4+BKxyZxUj0EmpYCOi5utrhPv9rDYIEaAPtAie0VPA/vCQ7pmf6jWyvRp+KDbgBXUi6I3iOSSIHeFq7IHyu5ifzdtY/jFWBdQvGyr8RZOJvNK0GDNtRXyF1/off1P0",
                "WinCount": 1
            },
            "ForkSignaling": 0,
            "Height": 4622139,
            "Messages": {
                "/": "bafy2bzacecdviu4z4tpxkznndxsfx7oin7dd2ozsecjjf3m7ybbdxtcmqnhw4"
            },
            "Miner": "f02030031",
            "ParentBaseFee": "100",
            "ParentMessageReceipts": {
                "/": "bafy2bzacecx4rrhiogzu2nhectk474c2z3otvjzqczc2en765eemsppsnrf6s"
            },
            "ParentStateRoot": {
                "/": "bafy2bzacecykngguo4ig5xqzrk4lahplbxu57ofnxwanceqntnxz4z2ihghby"
            },
            "ParentWeight": "110143909530",
            "Parents": [
                {
                    "/": "bafy2bzaced5wq2hx4beqcjhir4ttrvtxesdzx2revxnw4i7xw2kdlr5bhnvoc"
                },
                {
                    "/": "bafy2bzacedejwwjvblyklbh7u3nyyq7eyeddq3mee6t3qw3wl3cioecdfxmje"
                },
                {
                    "/": "bafy2bzaceb4fx3vbujf7dur6ohs6mjhft2am26qt4szoelq7wmeyo2epxsc3u"
                },
                {
                    "/": "bafy2bzacebatiwqhu4p5khjwp4khujej42fwlop5rcd3nn6xaj6mlpr5rgbbi"
                },
                {
                    "/": "bafy2bzacea2f7vcvhiudumkscfna6nuntqrzzzg26sh3w3g3xa6n7dxryr2r4"
                }
            ],
            "Ticket": {
                "VRFProof": "kohYLajd8luYxbxEH1eP8a9WiE3RnL611M76QkpWtiV7nvd6OTaBTGO0cTqW7dSKCQzCWwj/FFjKEypMgVw+MqrKS2lEtWUzt6DqEU6Q29Dqe7D0nWaq7+bQNTGLzpGS"
            },
            "Timestamp": 1736970570,
            "WinPoStProof": [
                {
                    "PoStProof": 4,
                    "ProofBytes": "tHkKQH/Tdeg91vu2uRrdKZ2Jc73/vCnD2DLXSLVETbN+kcACr/KhvZ3RKAyKGnVimT664j2DhCy7s6LKgVYjwZ4Tu7VYB2U83vzSVg7ILnGNiB5JJ8WEYYIOGtfA44eQDcd5Bdkkjzf5WRYb4k05M6AGN0xONcx/ekQ1/aPrl/0CiXbngc219lknFbVuu1MpofdMEZtuWiG+6cnnMsB5t8Y8jF87FXWgbUUvTp3+a6XfsnEuPwt7QWZb6N/PFSiI"
                }
            ]
        },
        {
            "BLSAggregate": {
                "Data": "hkVfsaxZySEta2kL28jjFZ2XH2vFQKB7JjPmrfQR0gC2ssBo1KxRdDh1R+AeEoSNDsxRsxQaHNUy6K7YCBiKbwwlau132eLX++OtVdXlhfSvxi9cMLUJ1bPjNHD208+5",
                "Type": 2
            },
            "BeaconEntries": [
                {
                    "Data": "tbjCwGcatwCMd2AGpWvsM5vVLaQ3bKdX/r+FIvaDfU+GEo4xuPUm7JQg69gLSvht",
                    "Round": 14722392
                }
            ],
            "BlockSig": {
                "Data": "pZ8DNErr5iPGeHEFvsA7WiENgU1Sq9MAQR8ikjCvfYNPwbUN+r6Lb9Ah5mV95FH5FOthaj973LFQNlBl3Bt3SKyvorm7o/dHezy6BAY6JRSFmGRrcK20pRhjtwdG3hI2",
                "Type": 2
            },
            "ElectionProof": {
                "VRFProof": "opxo27KWmXhZPTAQgH7e0agHEFAome7rSSbbZf5Q34brUlZP7bxCCYHcK1aX7C8GDNP347mfb276EdPHJEmlqxAkM59ySj5ojAW79r4HMoveIQdOanZIp/WTHV2tCfTl",
                "WinCount": 1
            },
            "ForkSignaling": 0,
            "Height": 4622139,
            "Messages": {
                "/": "bafy2bzacedodw7snpsltjl5t5z2zlu6nell5tommmhfsrb3uxfgd3aeshib4u"
            },
            "Miner": "f03190616",
            "ParentBaseFee": "100",
            "ParentMessageReceipts": {
                "/": "bafy2bzacecx4rrhiogzu2nhectk474c2z3otvjzqczc2en765eemsppsnrf6s"
            },
            "ParentStateRoot": {
                "/": "bafy2bzacecykngguo4ig5xqzrk4lahplbxu57ofnxwanceqntnxz4z2ihghby"
            },
            "ParentWeight": "110143909530",
            "Parents": [
                {
                    "/": "bafy2bzaced5wq2hx4beqcjhir4ttrvtxesdzx2revxnw4i7xw2kdlr5bhnvoc"
                },
                {
                    "/": "bafy2bzacedejwwjvblyklbh7u3nyyq7eyeddq3mee6t3qw3wl3cioecdfxmje"
                },
                {
                    "/": "bafy2bzaceb4fx3vbujf7dur6ohs6mjhft2am26qt4szoelq7wmeyo2epxsc3u"
                },
                {
                    "/": "bafy2bzacebatiwqhu4p5khjwp4khujej42fwlop5rcd3nn6xaj6mlpr5rgbbi"
                },
                {
                    "/": "bafy2bzacea2f7vcvhiudumkscfna6nuntqrzzzg26sh3w3g3xa6n7dxryr2r4"
                }
            ],
            "Ticket": {
                "VRFProof": "s9QA2q1Eym3KJ/0bveOUoQ0EVepSQWN+By4LLI3sglgjk5yzlDg4e8uXXfd+yc0WAgU6euqNomCfu+14pYJE9zhtv5ZMotlN9KKYRpTB1tPPyAYxUaLvFXw7YfpWzSsw"
            },
            "Timestamp": 1736970570,
            "WinPoStProof": [
                {
                    "PoStProof": 3,
                    "ProofBytes": "q8+y3oHT2Lufhcxqt+0aNDLS2uScMov449S9cFQPwaaDLMnBB7VxOwfIltD10fZ9t3vSOrCpQzviq2UGqTVOcJnwiMu22u7AN1iX1w0lgjl9XbTO2JS040s0AJNv4kCREhDzzdlvxMR6tpaNv2SXNwCsoQjBPXqO5BWggs0wPNL1qmFfuVYWwYGphgSd6klUkL2mY2feSjjxNEKotEHkCLE8+cE5sFvfLHBg8v57XkGPrQLRkNYiBysENH3YJQUH"
                }
            ]
        },
        {
            "BLSAggregate": {
                "Data": "hY6epxNLDQchgLj6vaXdfLxijkLI6Di6CqtGFJQfEpz3/L4aY6SyLDmdPwdiimutFUGpWENGWH5yC9CyYUy6wjqEzG3vlKwh6hJgF4f1qTd3wC8rQ6lGF88mY7Bad9TY",
                "Type": 2
            },
            "BeaconEntries": [
                {
                    "Data": "tbjCwGcatwCMd2AGpWvsM5vVLaQ3bKdX/r+FIvaDfU+GEo4xuPUm7JQg69gLSvht",
                    "Round": 14722392
                }
            ],
            "BlockSig": {
                "Data": "kom57LDV09djyj84nnDp4Gew+hC7nRrzBvFD/jaylA/dfeN4NkOJQaYMWpsuMIULA4MW6/y5vtS5U3aGnTYm90Rp5/aAKRHjy4XwtBfrdJOKY0Wf/dXvgePSr/2NDH0R",
                "Type": 2
            },
            "ElectionProof": {
                "VRFProof": "lkzYvpn3Wz7pXNEszNOoaT2Gcmk/FyrCEc5ofMbU+nb82tO46XaU8dUDOkLPp978FEPKR3VmQtGsfMDFNcNCpgT4uTeA3SzI31uku0Zf+tlvoM7pCwRwH2w/Y4Rssv0L",
                "WinCount": 1
            },
            "ForkSignaling": 0,
            "Height": 4622139,
            "Messages": {
                "/": "bafy2bzacebsa64lnwkcmq2ipdedvqg35wih2hsvvv5rhbr6jeaqv4qhbwotx6"
            },
            "Miner": "f02894875",
            "ParentBaseFee": "100",
            "ParentMessageReceipts": {
                "/": "bafy2bzacecx4rrhiogzu2nhectk474c2z3otvjzqczc2en765eemsppsnrf6s"
            },
            "ParentStateRoot": {
                "/": "bafy2bzacecykngguo4ig5xqzrk4lahplbxu57ofnxwanceqntnxz4z2ihghby"
            },
            "ParentWeight": "110143909530",
            "Parents": [
                {
                    "/": "bafy2bzaced5wq2hx4beqcjhir4ttrvtxesdzx2revxnw4i7xw2kdlr5bhnvoc"
                },
                {
                    "/": "bafy2bzacedejwwjvblyklbh7u3nyyq7eyeddq3mee6t3qw3wl3cioecdfxmje"
                },
                {
                    "/": "bafy2bzaceb4fx3vbujf7dur6ohs6mjhft2am26qt4szoelq7wmeyo2epxsc3u"
                },
                {
                    "/": "bafy2bzacebatiwqhu4p5khjwp4khujej42fwlop5rcd3nn6xaj6mlpr5rgbbi"
                },
                {
                    "/": "bafy2bzacea2f7vcvhiudumkscfna6nuntqrzzzg26sh3w3g3xa6n7dxryr2r4"
                }
            ],
            "Ticket": {
                "VRFProof": "kjIH81iqD5MI0Y8cX5BuXSvEQWgfrbpP2IUJnLl/AGELRKa9SDtwU3+79c95vS6VCApKReupY53rfhuBHUhHlPmZf0/KgADmnQxq/4grF/aOSk9sI3Bfm772tvwjUqqa"
            },
            "Timestamp": 1736970570,
            "WinPoStProof": [
                {
                    "PoStProof": 3,
                    "ProofBytes": "tvUxHrMSkz82JD/7ZvmsCMEgPnUFvYQLdgzc1y+pbcjOL7V+aRL5x/hsm3WnMfgtsHbIkFSrKD4iGmezmn/+6GAVSAIJnB6Xb5FIDyMlprT7dYgmGiraRoj042YfOiYYFc56mIpTM90QWxMd9Et+kZIkD8tBiEMWLBkqKvlKKxq6pYW94B9csmrQbgI+SjCkkqjKyvOxxsytcqUIQyZiowCuq5o/IBC/bv0dXvPiWdxSEnmebS0NmEUHpre48YXb"
                }
            ]
        }
    ],
    "Cids": [
        {
            "/": "bafy2bzacebfszvuwfda2ndsn4iua7qcccdgyxr5g66lg75pk7gwo5rtwn5koi"
        },
        {
            "/": "bafy2bzaceckgd3fyg4sdtmpul54jxcoqjygxlclde53qagvsb4wo6ggmnyhyc"
        },
        {
            "/": "bafy2bzacecumvrshkdpsypq4nm67vtjvxmogdqbqag5lgb4myxbpomyja52u4"
        }
    ],
    "Height": 4622139
}

export { chainHeadTestData }