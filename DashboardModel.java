package lt.firm.product.models.Controller.Dashboard;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.google.common.collect.Iterables;
import lt.firm.product.config.SecurityConfiguration;
import lt.firm.product.domain.Carline;
import lt.firm.product.domain.DashboardKpiView;
import lt.firm.product.domain.KpiProperty;
import lt.firm.product.domain.Plant;
import lt.firm.product.mapper.*;
import lt.firm.product.models.Mapper.DashboardKpiView.DashboardKpiViewPersonToTemplateMap;
import lt.firm.product.models.Mapper.DashboardKpiView.ExcludedKpiItem;
import lt.firm.product.models.Mapper.Kpi.KpiDataForCalculations;
import lt.firm.product.models.Mapper.KpiGroup.KpiGroupEx;
import lt.firm.product.models.Mapper.Target.TargetResult;
import lt.firm.product.service.KpiCalculator;
import lt.firm.product.service.TargetCalculator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Component;
import org.springframework.util.StopWatch;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.function.Predicate;
import java.util.stream.Collectors;
import java.util.stream.DoubleStream;

/**
 * model for dashboards
 */
@Component
public class DashboardModel {

    @Autowired
    KpiGroupMapper kpiGroupMapper;

    @Autowired
    KpiCalculator calculator;

    @Autowired
    KpiMapper kpiMapper;

    @Autowired
    TargetMapper targetMapper;

    @Autowired
    PlantMapper plantMapper;

    @Autowired
    DashboardKpiViewMapper dashboardKpiViewMapper;

    @Autowired
    CarlineMapper carlineMapper;

    public DashboardModel() {
    }

    public static DateTimeFormatter FORMATTER_YEAR_MONTH = DateTimeFormatter.ofPattern("yyyyMM");

    private static Integer fillKpiGroup(List<KpiGroupEx> kpiGroup, KpiDataForCalculations kpi) {

        return kpiGroup.stream().filter(f -> f.getKpiId() == kpi.ratioId && f.getKpiPropId() == kpi.ratioValueId).mapToInt(m -> m.getId()).findFirst().getAsInt();
    }

    public static double calculateValue(String aggMethod, DoubleStream doubleStream) {
        double value;
        switch (aggMethod) {
            case "SUM":
                value = doubleStream.sum();
                break;
            case "TOP":
                value = doubleStream.max().getAsDouble();
                break;
            case "AVG":
            default:
                value = doubleStream.average().orElseGet(() -> 0d);
        }
        return value;
    }

    public TargetCalculator.Targets retrieveTargets(Integer year,
                                                    Integer ratioValueId,
                                                    Optional<Integer> monthParam,
                                                    Integer plantId) {

        int month = monthParam.orElseGet(() -> 10);
        LocalDate periodStart = LocalDate.of(year - 1, month, 1);
        String start = FORMATTER_YEAR_MONTH.format(periodStart);
        String end = FORMATTER_YEAR_MONTH.format(periodStart.plusYears(1).minusMonths(1));
        List<TargetResult> targetsComplete = targetMapper.findTargetsComplete(plantId, start, end, ratioValueId, 0, 0);
        return new TargetCalculator().extractGeneralTargetsForMonths(periodStart, targetsComplete, 0);
    }


    public List<DashboardKpiViewEx> getPersonalTemplates(long personId) {


        List<DashboardKpiViewEx> result;

        DashboardKpiViewPersonToTemplateMap personTemplateMap = dashboardKpiViewMapper.selectPerson2TemplateDataByPersonId(personId);

        List<DashboardKpiViewTemplatesWithExcludedKpi> items = dashboardKpiViewMapper.getExcludedKpiTemplateNamesByPersonAndType(personId, TemplateType.PERSONAL.toString());


        result = items.stream().map(m -> {
            DashboardKpiViewEx r = new DashboardKpiViewEx();
            r.setId(m.getId());
            r.setPersonId(m.getPersonId());
            r.setTemplateName(m.getTemplateName());
            r.setType(m.getType());
            r.setExcludedKpiIdList(m.getExcludedKpiIdList());

            if (personTemplateMap != null) {
                if (m.getId() == personTemplateMap.getDashboardKpiViewId()) {
                    r.setActive(true);
                }
            } else {
                r.setActive(false);
            }

            return r;
        }).collect(Collectors.toList());

        return result;
    }

    public void setActivePersonalTemplate(DashboardKpiViewEx item, long personId) {

        int records = dashboardKpiViewMapper.existsPersonRecordInDashboardKpiViewPersonToTemplateMap(personId);
        if (records > 0) {
            dashboardKpiViewMapper.updatePerson2TemplateDataByPersonId(personId, item.getId());
        } else {
            dashboardKpiViewMapper.insertPerson2TemplateData(personId, item.getId());
        }
    }

    public void editPersonalTemplate(List<Integer> excludedKpiIdList, Integer dashboardTemplateId) {

        dashboardKpiViewMapper.deleteDashboardKpiViewTemplateByDashboardKpiViewId(dashboardTemplateId);

        List<ExcludedKpiItem> itemsToInsert = new ArrayList<>();
        excludedKpiIdList.forEach(i ->
                itemsToInsert.add(new ExcludedKpiItem(dashboardTemplateId, i))
        );

        dashboardKpiViewMapper.insertTemplateData(itemsToInsert);
    }

    public void createPersonalTemplate(List<Integer> items, String templateName, String type, long personId) {

        List<ExcludedKpiItem> excludedKpiItems = new ArrayList<>();
        items.forEach(item -> excludedKpiItems.add(new ExcludedKpiItem(personId, item)));
        if (excludedKpiItems.size() > 0) {

            DashboardKpiView dashboardKpiView = new DashboardKpiView();

            dashboardKpiView.setPersonId(personId);
            dashboardKpiView.setTemplateName(templateName);
            dashboardKpiView.setType(type);

            int index = dashboardKpiViewMapper.insertDashboardViewData(dashboardKpiView);

            List<ExcludedKpiItem> excludedItems = new ArrayList<>();
            items.forEach(item ->
                    excludedItems.add(new ExcludedKpiItem(dashboardKpiView.getId(), item))
            );

            dashboardKpiViewMapper.insertTemplateData(excludedItems);
        }
    }

    /*
    * Calculate dashboard data by PlantType
    * */
    public Map<Integer, AggregateRatioContainer> calculateByFilter(int year,
                                                                   int plantTypeId,
                                                                   Integer regionId,
                                                                   Integer cbuId,

                                                                   Integer dashboardTemplateId) throws JsonProcessingException {

        int month = 10;
        LocalDate periodStart = LocalDate.of(year, month, 1);
        List<KpiGroupEx> kpiGroup = kpiGroupMapper.getKpiGroupEx();
        String start = FORMATTER_YEAR_MONTH.format(periodStart);
        String end = FORMATTER_YEAR_MONTH.format(periodStart.plusYears(1).minusMonths(1));

        StopWatch sw = new StopWatch();
        sw.start("Initialize plant list");
        //Optional<Long> personId = Optional.of(principal.person.getId());
        Optional<Integer> templateId = Optional.of(dashboardTemplateId);


        Map<Integer, Map<String, List<AggregateResult>>> result = new LinkedHashMap<>();
        calculator.aggregateAllKpiValues(LocalDate.of(year, 10, 1), 12, regionId, plantTypeId, cbuId, templateId, (KpiCalculator.ResultBuilder) (plant1, kpi, dataValue, related) -> {
            if (kpi.isMainValue && !related) {
                AggregateResult aggregateResult = new AggregateResult();
                aggregateResult.plantId = dataValue.plantId;
                aggregateResult.carlineId = dataValue.carlineId;
                aggregateResult.plantType = plant1.plantTypeID;
                aggregateResult.regionId = plant1.regionId;
                if (dataValue.value != null) {
                    aggregateResult.value = dataValue.value.doubleValue();
                }
                result.putIfAbsent(kpi.ratioId, new HashMap<>());
                result.get(kpi.ratioId).putIfAbsent(dataValue.writeDate, new ArrayList<>());
                result.get(kpi.ratioId).get(dataValue.writeDate).add(aggregateResult);
            }
        });

        //});
        sw.stop();

        sw.start("filtering " + result.size() + " entries");

        /*
        * Aggregates data over time period
        * */
        StopWatch sw2 = new StopWatch();
        Map<Integer, AggregateRatioContainer> toReturn = new LinkedHashMap<>();


        List<KpiDataForCalculations> kpiDataForCalculations = kpiMapper.getKpiDataForCalculations();
        result.forEach((kpiId, aggregatesByWriteDate) -> {
            //TODO its wrong to use findFirst, need to use getKpiMainProperty(kpiId)
            KpiDataForCalculations kpiForCalc = getKpiMainProperty(kpiDataForCalculations, kpiId);
            aggregatesByWriteDate.forEach((writeDate, listToAggregate) -> {
                toReturn.putIfAbsent(kpiForCalc.ratioId, new AggregateRatioContainer(kpiForCalc, new ArrayList<>()));
                toReturn.get(kpiForCalc.ratioId).finalResults.add(new FinalResult(listToAggregate.get(0).value, writeDate));
            });

            kpiForCalc.kpiGroupId = fillKpiGroup(kpiGroup, kpiForCalc);
            //doing targets
            sw2.start("Initialize target :" + kpiForCalc.ratioValueId);
            KpiProperty trulyMainValue = getKpiMainProperty(kpiId);

            List<TargetResult> targetsComplete = targetMapper.findTargetsComplete(0, start, end, trulyMainValue.getId(), plantTypeId, regionId);
            toReturn.get(kpiForCalc.ratioId).targets = new TargetCalculator.Targets();
            if (targetsComplete.size() > 0) {
                TargetCalculator.Targets targets = new TargetCalculator().extractGeneralTargetsForMonths(periodStart, targetsComplete, 3);
                targets.carlineTargets = new HashMap<>();
                toReturn.get(kpiForCalc.ratioId).targets = targets;
            }
            sw2.stop();
        });


        // calculate aggregate values with filter


        sw.stop();
        //System.out.println("Retrieved " + result.values().size() + " entries " + sw.prettyPrint() + sw2.prettyPrint());
        //System.out.println(new ObjectMapper().writeValueAsString(toReturn));
        return toReturn;
    }

    /*
    * Returns main value, if main value not set returns last KPI Property as Main value
    * */
    private KpiDataForCalculations getKpiMainProperty(List<KpiDataForCalculations> kpiList, Integer kpiId) {
        List<KpiDataForCalculations> kpiForCalc = kpiList.stream().filter(kpiProp -> kpiProp.ratioId == kpiId).collect(Collectors.toList());
        return kpiForCalc.stream().filter(kpiProp -> kpiProp.ratioId == kpiId && kpiProp.isMainValue).findFirst()
                .orElseGet(() -> Iterables.getLast(kpiForCalc));
    }

    /*
    * Returns main value, if main value not set returns last KPI Property as Main value
    * */
    private KpiProperty getKpiMainProperty(Integer kpiId) {
        List<KpiProperty> kpiProps = kpiMapper.getKpiPropsByKpiId(kpiId);

        return kpiProps
                .stream().filter(kpiProp -> kpiProp.getIsMainValue() == 0).findFirst()
                .orElseGet(() -> Iterables.getLast(kpiProps));
    }

    /*
    * Calculate dashboard data by PlantId
    * */
    public Map<Integer, AggregateRatioContainer> calculatePlantAllKpis(int plantId,
                                                                       int year,
                                                                       @AuthenticationPrincipal SecurityConfiguration.PersonUserDetails principal,
                                                                       Integer dashboardTemplateId) throws JsonProcessingException
    {

        List<KpiGroupEx> kpiGroup = kpiGroupMapper.getKpiGroupEx();
        Predicate<AggregateResult> plantFilterByAndrius = plantData -> plantData.plantId == plantId;

        // StopWatch sw = new StopWatch();

        Plant plant = plantMapper.selectPlantById(plantId);
        List<   Carline> plantCarlines = carlineMapper.getCarlinesByPlantId(plantId);

        // kpi, date, dataValue
        Map<KpiDataForCalculations, Map<String, List<AggregateResult>>> result = new LinkedHashMap<>();


        Optional<Integer> templateId = Optional.of(dashboardTemplateId);

        // sw.start("calculations for plant " + plant.getShortName());
        calculator.processAllKpiValues(LocalDate.of(year, 10, 1), 12, plant, plantCarlines, templateId, (KpiCalculator.ResultBuilder) (plant1, kpi, dataValue, related) -> {
            if (kpi.isMainValue && !related) {
                AggregateResult aggregateResult = new AggregateResult();
                aggregateResult.plantId = dataValue.plantId;
                aggregateResult.carlineId = dataValue.carlineId;
                aggregateResult.plantType = plant1.plantTypeID;
                aggregateResult.regionId = plant1.regionId;
                if (dataValue.value != null) {
                    aggregateResult.value = dataValue.value.doubleValue();
                }
                kpi.kpiGroupId = fillKpiGroup(kpiGroup, kpi);
                result.putIfAbsent(kpi, new HashMap<>());
                result.get(kpi).putIfAbsent(dataValue.writeDate, new ArrayList<>());
                result.get(kpi).get(dataValue.writeDate).add(aggregateResult);
            }
        });


        Map<Integer, AggregateRatioContainer> toReturn = new LinkedHashMap<>();
        // kpi = 1, aggregates = 201501 = [....]
        StopWatch sw2 = new StopWatch();
        result.forEach((kpiDataForCalculations, aggregatesByWriteDate) -> {

            TargetCalculator.Targets targets = retrieveTargets(year + 1, kpiDataForCalculations.ratioValueId, Optional.empty(), plantId);

            aggregatesByWriteDate.forEach((writeDate, listToAggregate) -> {
                double value = 0;

                if (kpiDataForCalculations.rowAggMethod == null) {
                    kpiDataForCalculations.rowAggMethod = "AVG";
                }
                DoubleStream doubleStream = listToAggregate.stream().filter(plantFilterByAndrius).mapToDouble(AggregateResult::getValue);
                value = calculateValue(kpiDataForCalculations.rowAggMethod, doubleStream);
                toReturn.putIfAbsent(kpiDataForCalculations.ratioId, new AggregateRatioContainer(kpiDataForCalculations, new ArrayList<>()));
                toReturn.get(kpiDataForCalculations.ratioId).finalResults.add(new FinalResult(value, writeDate));
                toReturn.get(kpiDataForCalculations.ratioId).targets = targets;
                //toReturn.get(kpiDataForCalculations.ratioId).targets = targets2;
            });
        });



        return toReturn;
    }


}
