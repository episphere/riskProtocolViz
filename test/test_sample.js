import {assert} from 'https://cdn.jsdelivr.net/npm/chai@5.2.1/chai.min.js'
import { Sample, Multisample } from '../sample.js'
import { Test } from '../test.js';

const example_test_config = {
    "testName": "My Example Test",
    "outcomes": ["TEST_POSITIVE", "TEST_NEGATIVE"],
    "probabilities": function (year) {
        return {
            "CIN_LT_2": { "TEST_POSITIVE": 0.05, "TEST_NEGATIVE": 0.95 },
            "CIN2": { "TEST_POSITIVE": 0.75, "TEST_NEGATIVE": 0.25 },
            "CIN3": { "TEST_POSITIVE": 0.95, "TEST_NEGATIVE": 0.05 },
        }
    }
}

describe("Sample Tests",
    describe("Addition", function () {
        it("Should add samples", function () {
            let sample1 = Sample.fromObject({ CIN_LT_2: 10, CIN2: 1 });
            let sample2 = Sample.fromObject({ CIN_LT_2: 5, CIN2: 1 })

            assert.equal(11, sample1.total)
            assert.equal(6, sample2.total)
            let sum = sample1.add(sample2)
            assert.equal(17, sum.total)
            assert.equal(15, sum.counts.CIN_LT_2)
            assert.equal(2, sum.counts.CIN2)
        }),
        it("Should be able to be a parameter to Test.run()",function(){
            let sample = Sample.fromObject({CIN_LT_2:1000,CIN2:100})
            let test=new Test(example_test_config);
            let results = test.run(sample,0)
            assert.isNotNull(results)
            assert.equal(50,results.TEST_POSITIVE.counts.CIN_LT_2)
            assert.equal(75,results.TEST_POSITIVE.counts.CIN2)
            assert.equal(950,results.TEST_NEGATIVE.counts.CIN_LT_2)
            assert.equal(25,results.TEST_NEGATIVE.counts.CIN2)
            assert.notProperty(results.TEST_POSITIVE.counts,"CIN3","Should not have property CIN3")
            assert.notProperty(results.TEST_NEGATIVE.counts,"CIN3","Should not have property CIN3")
        })
    })
)
describe("Multisample Tests",
    it("should create a Multisample", function () {
        let cin2 = { CIN_LT_2: 10, CIN2: 5 };
        let cin3 = { values: { CIN3: 3 }, missingLabel: "CIN_LT_3" };
        let ms1 = Multisample.build(cin2, cin3);
        assert.equal(15, ms1.total);

        assert.equal(15, ms1.samples[0].total)
        assert.equal(5, ms1.samples[0].counts.CIN2)
        assert.equal(10, ms1.samples[0].counts.CIN_LT_2)
        assert.equal(15, ms1.samples[1].total)
        assert.equal(3, ms1.samples[1].counts.CIN3)
        assert.equal(12, ms1.samples[1].counts.CIN_LT_3)
        
        assert.equal(0,ms1.labelMap['CIN_LT_2'])
        assert.equal(0,ms1.labelMap['CIN2'])
        assert.equal(1,ms1.labelMap['CIN3'])
    }),
    it("should be created from an array of samples",function(){
        let sampleArray=[Sample.fromObject({CIN_LT_2:1000,CIN2:100}),
            Sample.fromObject({CIN_LT_3:900,CIN3:200})]
        let sample = Multisample.build_from_samples(sampleArray,["CIN_LT_2","CIN2","CIN3"])
        assert.isNotNull(sample)
        assert.equal(1100,sample.total)
        assert.deepEqual(sample.labels,["CIN_LT_2","CIN2","CIN3"])
        assert.hasAllKeys(sample.labelMap,["CIN_LT_2","CIN2","CIN3"])
        assert.hasAllKeys(sample.counts,["CIN_LT_2","CIN2","CIN3"])
    }),
    it("should add",function(){
        let ms1 = Multisample.build({not_a:10,a:5}, {values:{b:3},missingLabel:"not_b"} );
        let ms2 = Multisample.build({not_a:20,a:10}, {values:{b:5},missingLabel:"not_b"} );
        let sum = ms1.add(ms2)
        assert.equal(45,sum.total)
    }),
    it("Should be able to be a parameter to Test.run()",function(){
        let sample = Multisample.build({CIN_LT_2:1000,CIN2:100}, {values:{CIN3:50},missingLabel:"CIN_LT_3"} );
        let test=new Test(example_test_config);
        let results = test.run(sample,0);

        assert.isNotNull(results);
        assert.equal(results.TEST_POSITIVE.counts.CIN_LT_2, 50)
        assert.equal(results.TEST_POSITIVE.counts.CIN2, 75 )
        assert.equal(results.TEST_POSITIVE.counts.CIN3, 47.5)
        assert.equal(results.TEST_NEGATIVE.counts.CIN_LT_2, 950)
        assert.equal(results.TEST_NEGATIVE.counts.CIN2, 25)
        assert.equal(results.TEST_NEGATIVE.counts.CIN3, 2.5)

    })
)